/*
 *  Copyright 2021 Collate
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.openmetadata.service.security.saml;

import com.onelogin.saml2.Auth;
import java.io.IOException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

/**
 * This Servlet initiates a login and sends a login request to the IDP. After a successful processing it redirects user
 * to the relayState which is the callback setup in the config.
 */
@WebServlet("/api/v1/saml/login")
@Slf4j
public class SamlLoginServlet extends HttpServlet {
  @Override
  protected void doGet(final HttpServletRequest req, final HttpServletResponse resp)
      throws IOException {
    Auth auth;
    try {
      auth = new Auth(SamlSettingsHolder.getInstance().getSaml2Settings(), req, resp);
      auth.login(SamlSettingsHolder.getInstance().getRelayState());
    } catch (Exception e) {
      resp.setContentType("text/html; charset=UTF-8");
      LOG.error("[SamlLoginServlet] Failed in Auth Login : {}", e.getMessage());
      resp.getOutputStream()
          .println(
              String.format(
                  "<p> [SamlLoginServlet] Failed in Auth Login : %s </p>", e.getMessage()));
    }
  }
}
