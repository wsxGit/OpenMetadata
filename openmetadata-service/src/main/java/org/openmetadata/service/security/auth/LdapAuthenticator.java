package org.openmetadata.service.security.auth;

import static javax.ws.rs.core.Response.Status.FORBIDDEN;
import static javax.ws.rs.core.Response.Status.INTERNAL_SERVER_ERROR;
import static javax.ws.rs.core.Response.Status.UNAUTHORIZED;
import static org.openmetadata.schema.auth.TokenType.REFRESH_TOKEN;
import static org.openmetadata.service.exception.CatalogExceptionMessage.INVALID_EMAIL_PASSWORD;
import static org.openmetadata.service.exception.CatalogExceptionMessage.INVALID_USER_OR_PASSWORD;
import static org.openmetadata.service.exception.CatalogExceptionMessage.LDAP_MISSING_ATTR;
import static org.openmetadata.service.exception.CatalogExceptionMessage.MAX_FAILED_LOGIN_ATTEMPT;
import static org.openmetadata.service.exception.CatalogExceptionMessage.MULTIPLE_EMAIL_ENTRIES;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.unboundid.ldap.sdk.Attribute;
import com.unboundid.ldap.sdk.BindResult;
import com.unboundid.ldap.sdk.Filter;
import com.unboundid.ldap.sdk.LDAPConnection;
import com.unboundid.ldap.sdk.LDAPConnectionOptions;
import com.unboundid.ldap.sdk.LDAPConnectionPool;
import com.unboundid.ldap.sdk.LDAPException;
import com.unboundid.ldap.sdk.ResultCode;
import com.unboundid.ldap.sdk.SearchRequest;
import com.unboundid.ldap.sdk.SearchResult;
import com.unboundid.ldap.sdk.SearchResultEntry;
import com.unboundid.ldap.sdk.SearchScope;
import com.unboundid.util.ssl.SSLUtil;
import freemarker.template.TemplateException;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.openmetadata.common.utils.CommonUtil;
import org.openmetadata.schema.api.configuration.LoginConfiguration;
import org.openmetadata.schema.auth.LdapConfiguration;
import org.openmetadata.schema.auth.LoginRequest;
import org.openmetadata.schema.auth.RefreshToken;
import org.openmetadata.schema.entity.teams.Role;
import org.openmetadata.schema.entity.teams.User;
import org.openmetadata.schema.services.connections.metadata.AuthProvider;
import org.openmetadata.schema.settings.SettingsType;
import org.openmetadata.schema.type.EntityReference;
import org.openmetadata.service.Entity;
import org.openmetadata.service.OpenMetadataApplicationConfig;
import org.openmetadata.service.auth.JwtResponse;
import org.openmetadata.service.exception.CustomExceptionMessage;
import org.openmetadata.service.exception.EntityNotFoundException;
import org.openmetadata.service.exception.UnhandledServerException;
import org.openmetadata.service.jdbi3.RoleRepository;
import org.openmetadata.service.jdbi3.TokenRepository;
import org.openmetadata.service.jdbi3.UserRepository;
import org.openmetadata.service.resources.settings.SettingsCache;
import org.openmetadata.service.security.AuthenticationException;
import org.openmetadata.service.util.EmailUtil;
import org.openmetadata.service.util.JsonUtils;
import org.openmetadata.service.util.LdapUtil;
import org.openmetadata.service.util.TokenUtil;
import org.openmetadata.service.util.UserUtil;
import org.springframework.beans.BeanUtils;
import org.springframework.util.CollectionUtils;

@Slf4j
public class LdapAuthenticator implements AuthenticatorHandler {
  static final String LDAP_ERR_MSG = "[LDAP] Issue in creating a LookUp Connection ";
  private RoleRepository roleRepository;
  private UserRepository userRepository;
  private TokenRepository tokenRepository;
  private LoginAttemptCache loginAttemptCache;
  private LdapConfiguration ldapConfiguration;
  private LDAPConnectionPool ldapLookupConnectionPool;
  private LoginConfiguration loginConfiguration;

  @Override
  public void init(OpenMetadataApplicationConfig config) {
    if (config.getAuthenticationConfiguration().getProvider().equals(AuthProvider.LDAP)
        && config.getAuthenticationConfiguration().getLdapConfiguration() != null) {
      ldapLookupConnectionPool =
          getLdapConnectionPool(config.getAuthenticationConfiguration().getLdapConfiguration());
    } else {
      throw new IllegalStateException("Invalid or Missing Ldap Configuration.");
    }
    this.userRepository = (UserRepository) Entity.getEntityRepository(Entity.USER);
    this.roleRepository = (RoleRepository) Entity.getEntityRepository(Entity.ROLE);
    this.tokenRepository = Entity.getTokenRepository();
    this.ldapConfiguration = config.getAuthenticationConfiguration().getLdapConfiguration();
    this.loginAttemptCache = new LoginAttemptCache();
    this.loginConfiguration =
        SettingsCache.getSetting(SettingsType.LOGIN_CONFIGURATION, LoginConfiguration.class);
  }

  private LDAPConnectionPool getLdapConnectionPool(LdapConfiguration ldapConfiguration) {
    LDAPConnectionPool connectionPool;
    try {
      if (Boolean.TRUE.equals(ldapConfiguration.getSslEnabled())) {
        LDAPConnectionOptions connectionOptions = new LDAPConnectionOptions();
        LdapUtil ldapUtil = new LdapUtil();
        SSLUtil sslUtil =
            new SSLUtil(ldapUtil.getLdapSSLConnection(ldapConfiguration, connectionOptions));
        LDAPConnection connection =
            new LDAPConnection(
                sslUtil.createSSLSocketFactory(),
                connectionOptions,
                ldapConfiguration.getHost(),
                ldapConfiguration.getPort(),
                ldapConfiguration.getDnAdminPrincipal(),
                ldapConfiguration.getDnAdminPassword());
        // Use the connection here.
        connectionPool = new LDAPConnectionPool(connection, ldapConfiguration.getMaxPoolSize());
      } else {
        LDAPConnection conn =
            new LDAPConnection(
                ldapConfiguration.getHost(),
                ldapConfiguration.getPort(),
                ldapConfiguration.getDnAdminPrincipal(),
                ldapConfiguration.getDnAdminPassword());
        connectionPool = new LDAPConnectionPool(conn, ldapConfiguration.getMaxPoolSize());
      }
    } catch (LDAPException | GeneralSecurityException e) {
      LOG.error("[LDAP] Issue in creating a LookUp Connection", e);
      throw new IllegalStateException(LDAP_ERR_MSG, e);
    }
    return connectionPool;
  }

  @Override
  public JwtResponse loginUser(LoginRequest loginRequest) throws IOException, TemplateException {
    checkIfLoginBlocked(loginRequest.getEmail());
    User storedUser = lookUserInProvider(loginRequest.getEmail());
    validatePassword(storedUser.getEmail(), storedUser, loginRequest.getPassword());
    User omUser =
        checkAndCreateUser(
            storedUser.getEmail(), storedUser.getFullyQualifiedName(), storedUser.getName());
    return getJwtResponse(omUser, loginConfiguration.getJwtTokenExpiryTime());
  }

  /**
   * Check if the user exists in database by userName, if user exist, reassign roles for user according to it's ldap
   * group else, create a new user and assign roles according to it's ldap group
   *
   * @param email email address of user
   * @param userName userName of user
   * @param userDn the dn of user from ldap
   * @return user info
   * @author Eric Wen@2023-07-16 17:06:43
   */
  private User checkAndCreateUser(String email, String userName, String userDn) throws IOException {
    // Check if the user exists in OM Database
    try {
      User omUser =
          userRepository.getByName(null, userName, userRepository.getFields("id,name,email,roles"));
      getRoleForLdap(omUser, userDn, Boolean.TRUE);
      return omUser;
    } catch (EntityNotFoundException ex) {
      // User does not exist
      return userRepository.create(null, getUserForLdap(email, userName, userDn));
    } catch (LDAPException e) {
      LOG.error(
          "An error occurs when reassigning roles for an LDAP user({}): {}",
          userName,
          e.getMessage(),
          e);
      throw new UnhandledServerException(e.getMessage());
    }
  }

  @Override
  public void checkIfLoginBlocked(String email) {
    if (loginAttemptCache.isLoginBlocked(email)) {
      throw new AuthenticationException(MAX_FAILED_LOGIN_ATTEMPT);
    }
  }

  @Override
  public void recordFailedLoginAttempt(String providedIdentity, User storedUser)
      throws TemplateException, IOException {
    loginAttemptCache.recordFailedLogin(providedIdentity);
    int failedLoginAttempt = loginAttemptCache.getUserFailedLoginCount(providedIdentity);
    if (failedLoginAttempt == loginConfiguration.getMaxLoginFailAttempts()) {
      EmailUtil.sendAccountStatus(
          storedUser,
          "Multiple Failed Login Attempts.",
          String.format(
              "Someone is tried accessing your account. Login is Blocked for %s seconds.",
              loginConfiguration.getAccessBlockTime()));
    }
  }

  @Override
  public void validatePassword(String providedIdentity, User storedUser, String reqPassword)
      throws TemplateException, IOException {
    // performed in LDAP , the storedUser's name set as DN of the User in Ldap
    BindResult bindingResult = null;
    try {
      bindingResult = ldapLookupConnectionPool.bind(storedUser.getName(), reqPassword);
      if (Objects.equals(bindingResult.getResultCode().getName(), ResultCode.SUCCESS.getName())) {
        return;
      }
    } catch (Exception ex) {
      if (bindingResult != null
          && Objects.equals(
              bindingResult.getResultCode().getName(), ResultCode.INVALID_CREDENTIALS.getName())) {
        recordFailedLoginAttempt(providedIdentity, storedUser);
        throw new CustomExceptionMessage(
            UNAUTHORIZED, INVALID_USER_OR_PASSWORD, INVALID_EMAIL_PASSWORD);
      }
    }
    if (bindingResult != null) {
      throw new CustomExceptionMessage(
          INTERNAL_SERVER_ERROR, INVALID_USER_OR_PASSWORD, bindingResult.getResultCode().getName());
    } else {
      throw new CustomExceptionMessage(
          INTERNAL_SERVER_ERROR, INVALID_USER_OR_PASSWORD, INVALID_EMAIL_PASSWORD);
    }
  }

  @Override
  public User lookUserInProvider(String email) {
    try {
      Filter emailFilter =
          Filter.createEqualityFilter(ldapConfiguration.getMailAttributeName(), email);
      SearchRequest searchRequest =
          new SearchRequest(
              ldapConfiguration.getUserBaseDN(),
              SearchScope.SUB,
              emailFilter,
              ldapConfiguration.getMailAttributeName());
      SearchResult result = ldapLookupConnectionPool.search(searchRequest);
      // there has to be a unique entry for username and email in LDAP under the group
      if (result.getSearchEntries().size() == 1) {
        // Get the user using DN directly
        SearchResultEntry searchResultEntry = result.getSearchEntries().get(0);
        String userDN = searchResultEntry.getDN();
        Attribute emailAttr =
            searchResultEntry.getAttribute(ldapConfiguration.getMailAttributeName());

        if (!CommonUtil.nullOrEmpty(userDN) && emailAttr != null) {
          return getUserForLdap(email).withName(userDN);
        } else {
          throw new CustomExceptionMessage(FORBIDDEN, INVALID_USER_OR_PASSWORD, LDAP_MISSING_ATTR);
        }
      } else if (result.getSearchEntries().size() > 1) {
        throw new CustomExceptionMessage(
            INTERNAL_SERVER_ERROR, MULTIPLE_EMAIL_ENTRIES, MULTIPLE_EMAIL_ENTRIES);
      } else {
        throw new CustomExceptionMessage(
            INTERNAL_SERVER_ERROR, MULTIPLE_EMAIL_ENTRIES, INVALID_EMAIL_PASSWORD);
      }
    } catch (LDAPException ex) {
      throw new CustomExceptionMessage(INTERNAL_SERVER_ERROR, "LDAP_ERROR", ex.getMessage());
    }
  }

  private User getUserForLdap(String email) {
    String userName = email.split("@")[0];
    return new User()
        .withId(UUID.randomUUID())
        .withName(userName)
        .withFullyQualifiedName(userName)
        .withEmail(email)
        .withIsBot(false)
        .withUpdatedBy(userName)
        .withUpdatedAt(System.currentTimeMillis())
        .withIsEmailVerified(false)
        .withAuthenticationMechanism(null);
  }

  private User getUserForLdap(String email, String userName, String userDn) {
    User user =
        new User()
            .withId(UUID.randomUUID())
            .withName(userName)
            .withFullyQualifiedName(userName)
            .withEmail(email)
            .withIsBot(false)
            .withUpdatedBy(userName)
            .withUpdatedAt(System.currentTimeMillis())
            .withIsEmailVerified(false)
            .withAuthenticationMechanism(null);

    try {
      getRoleForLdap(user, userDn, false);
    } catch (LDAPException | JsonProcessingException e) {
      LOG.error(
          "Failed to assign roles from LDAP to OpenMetadata for the user {} due to {}",
          user.getName(),
          e.getMessage());
    }
    return user;
  }

  /**
   * Getting user's roles according to the mapping between ldap groups and roles
   *
   * @param user user object
   * @param userDn the dn of user from ldap
   * @param reAssign flag to decide whether to reassign roles
   * @author Eric Wen@2023-07-16 17:23:57
   */
  private void getRoleForLdap(User user, String userDn, Boolean reAssign)
      throws LDAPException, JsonProcessingException {
    // Get user's groups from LDAP server using the DN of the user
    try {
      Filter groupFilter =
          Filter.createEqualityFilter(
              ldapConfiguration.getGroupAttributeName(),
              ldapConfiguration.getGroupAttributeValue());
      Filter groupMemberAttr =
          Filter.createEqualityFilter(ldapConfiguration.getGroupMemberAttributeName(), userDn);
      Filter groupAndMemberFilter = Filter.createANDFilter(groupFilter, groupMemberAttr);
      SearchRequest searchRequest =
          new SearchRequest(
              ldapConfiguration.getGroupBaseDN(),
              SearchScope.SUB,
              groupAndMemberFilter,
              ldapConfiguration.getAllAttributeName());
      SearchResult searchResult = ldapLookupConnectionPool.search(searchRequest);

      // if user don't belong to any group, assign empty role list to it
      if (CollectionUtils.isEmpty(searchResult.getSearchEntries())) {
        if (Boolean.TRUE.equals(reAssign)) {
          user.setRoles(this.getReassignRoles(user, new ArrayList<>(0), Boolean.FALSE));
          UserUtil.addOrUpdateUser(user);
        }
        return;
      }

      // get the role mapping from LDAP configuration
      Map<String, List<String>> roleMapping =
          JsonUtils.readValue(ldapConfiguration.getAuthRolesMapping(), new TypeReference<>() {});
      List<EntityReference> roleReferenceList = new ArrayList<>();

      boolean adminFlag = Boolean.FALSE;

      // match the user's ldap groups with the role mapping according to groupDN
      for (SearchResultEntry searchResultEntry : searchResult.getSearchEntries()) {
        String groupDN = searchResultEntry.getDN();
        if (roleMapping.containsKey(groupDN)
            && !CollectionUtils.isEmpty(roleMapping.get(groupDN))) {
          List<String> roles = roleMapping.get(groupDN);
          for (String roleName : roles) {
            if (ldapConfiguration.getRoleAdminName().equals(roleName)) {
              adminFlag = Boolean.TRUE;
            } else {
              // Check if the role exists in OM Database
              try {
                Role roleOm =
                    roleRepository.getByName(null, roleName, roleRepository.getFields("id,name"));
                EntityReference entityReference = new EntityReference();
                BeanUtils.copyProperties(roleOm, entityReference);
                entityReference.setType(Entity.ROLE);
                roleReferenceList.add(entityReference);
              } catch (EntityNotFoundException ex) {
                // Role does not exist
                LOG.error("Role {} does not exist in OM Database", roleName);
              }
            }
          }
        }
      }
      // Remove duplicate roles by role name
      roleReferenceList =
          new ArrayList<>(
              roleReferenceList.stream()
                  .collect(
                      Collectors.toMap(
                          EntityReference::getName,
                          Function.identity(),
                          (entityReference1, entityReference2) -> entityReference1,
                          LinkedHashMap::new))
                  .values());
      user.setRoles(this.getReassignRoles(user, roleReferenceList, adminFlag));

      if (Boolean.TRUE.equals(reAssign)) {
        UserUtil.addOrUpdateUser(user);
      }
    } catch (Exception ex) {
      LOG.warn(
          "Failed to get user's groups from LDAP server using the DN of the user {} due to {}",
          userDn,
          ex.getMessage());
    }
  }

  private List<EntityReference> getReassignRoles(
      User user, List<EntityReference> mapRoleList, Boolean adminFlag) {
    Set<String> reassignRolesSet = ldapConfiguration.getAuthReassignRoles();
    // if setting indicates that all roles should be reassigned, just return the mapping roles
    if (!reassignRolesSet.contains(ldapConfiguration.getAllAttributeName())) {
      // if the ldap mapping roles shouldn't be reassigned, remove it
      if (!CollectionUtils.isEmpty(mapRoleList)) {
        for (int i = mapRoleList.size() - 1; i >= 0; i--) {
          EntityReference mappingRole = mapRoleList.get(i);
          if (!reassignRolesSet.contains(mappingRole.getName())) {
            mapRoleList.remove(i);
          }
        }
      }
      // if the old role shouldn't be reassigned, add it to the mapping list
      List<EntityReference> oldRoleList = user.getRoles();
      if (!CollectionUtils.isEmpty(oldRoleList)) {
        for (EntityReference oldRole : oldRoleList) {
          if (!reassignRolesSet.contains(oldRole.getName())) {
            mapRoleList.add(oldRole);
          }
        }
      }
      // check whether to reassign Admin or not
      if (reassignRolesSet.contains(ldapConfiguration.getRoleAdminName())) {
        user.setIsAdmin(adminFlag);
      }
    } else {
      user.setIsAdmin(adminFlag);
    }
    return mapRoleList;
  }

  @Override
  public RefreshToken createRefreshTokenForLogin(UUID currentUserId) {
    // just delete the existing token
    tokenRepository.deleteTokenByUserAndType(currentUserId, REFRESH_TOKEN.toString());
    RefreshToken newRefreshToken = TokenUtil.getRefreshToken(currentUserId, UUID.randomUUID());
    // save Refresh Token in Database
    tokenRepository.insertToken(newRefreshToken);

    return newRefreshToken;
  }
}
