package org.openmetadata.service.search;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.openmetadata.schema.type.EntityReference;
import org.openmetadata.schema.type.TagLabel;

public final class SearchIndexUtils {

  private SearchIndexUtils() {}

  public static List<String> parseFollowers(List<EntityReference> followersRef) {
    if (followersRef == null) {
      return Collections.emptyList();
    }
    return followersRef.stream().map(item -> item.getId().toString()).toList();
  }

  public static void removeNonIndexableFields(Map<String, Object> doc, Set<String> fields) {
    for (String key : fields) {
      if (key.contains(".")) {
        removeFieldByPath(doc, key);
      } else {
        doc.remove(key);
      }
    }
  }

  public static void removeFieldByPath(Map<String, Object> jsonMap, String path) {
    String[] pathElements = path.split("\\.");
    Map<String, Object> currentMap = jsonMap;

    for (int i = 0; i < pathElements.length - 1; i++) {
      String key = pathElements[i];
      Object value = currentMap.get(key);
      if (value instanceof Map) {
        currentMap = (Map<String, Object>) value;
      } else if (value instanceof List) {
        List<Map<String, Object>> list = (List<Map<String, Object>>) value;
        for (Map<String, Object> item : list) {
          removeFieldByPath(item, pathElements[i + 1]);
        }
      } else {
        // Path Not Found
        return;
      }
    }

    // Remove the field at the last path element
    String lastKey = pathElements[pathElements.length - 1];
    currentMap.remove(lastKey);
  }

  public static List<TagLabel> parseTags(List<TagLabel> tags) {
    if (tags == null) {
      return Collections.emptyList();
    }
    return tags;
  }
}
