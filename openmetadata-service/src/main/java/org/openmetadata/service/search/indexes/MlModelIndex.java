package org.openmetadata.service.search.indexes;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.openmetadata.schema.entity.data.MlModel;
import org.openmetadata.service.Entity;
import org.openmetadata.service.search.ParseTags;
import org.openmetadata.service.search.models.SearchSuggest;

public class MlModelIndex implements SearchIndex {
  final MlModel mlModel;

  public MlModelIndex(MlModel mlModel) {
    this.mlModel = mlModel;
  }

  @Override
  public List<SearchSuggest> getSuggest() {
    List<SearchSuggest> suggest = new ArrayList<>();
    suggest.add(SearchSuggest.builder().input(mlModel.getFullyQualifiedName()).weight(5).build());
    suggest.add(SearchSuggest.builder().input(mlModel.getName()).weight(10).build());
    return suggest;
  }

  @Override
  public Object getEntity() {
    return mlModel;
  }

  public Map<String, Object> buildSearchIndexDocInternal(Map<String, Object> doc) {
    ParseTags parseTags = new ParseTags(Entity.getEntityTags(Entity.MLMODEL, mlModel));
    Map<String, Object> commonAttributes = getCommonAttributesMap(mlModel, Entity.MLMODEL);
    doc.putAll(commonAttributes);
    doc.put(
        "displayName",
        mlModel.getDisplayName() != null ? mlModel.getDisplayName() : mlModel.getName());
    doc.put("tags", parseTags.getTags());
    doc.put("tier", parseTags.getTierTag());
    doc.put("serviceType", mlModel.getServiceType());
    doc.put("lineage", SearchIndex.getLineageData(mlModel.getEntityReference()));
    doc.put("service", getEntityWithDisplayName(mlModel.getService()));
    return doc;
  }

  public static Map<String, Float> getFields() {
    Map<String, Float> fields = SearchIndex.getDefaultFields();
    fields.put("mlFeatures.name", 8.0f);
    fields.put("mlFeatures.description", 1.0f);
    return fields;
  }
}
