package org.openmetadata.service.search.indexes;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.openmetadata.schema.entity.domains.DataProduct;
import org.openmetadata.service.Entity;
import org.openmetadata.service.search.models.SearchSuggest;

public record DataProductIndex(DataProduct dataProduct) implements SearchIndex {
  @Override
  public List<SearchSuggest> getSuggest() {
    List<SearchSuggest> suggest = new ArrayList<>();
    suggest.add(SearchSuggest.builder().input(dataProduct.getName()).weight(5).build());
    suggest.add(
        SearchSuggest.builder().input(dataProduct.getFullyQualifiedName()).weight(5).build());
    return suggest;
  }

  @Override
  public Object getEntity() {
    return dataProduct;
  }

  public Map<String, Object> buildSearchIndexDocInternal(Map<String, Object> doc) {
    Map<String, Object> commonAttributes = getCommonAttributesMap(dataProduct, Entity.DATA_PRODUCT);
    doc.putAll(commonAttributes);
    return doc;
  }

  public static Map<String, Float> getFields() {
    return SearchIndex.getDefaultFields();
  }
}
