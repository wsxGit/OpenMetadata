package org.openmetadata.service.search.indexes;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.openmetadata.schema.tests.TestCase;
import org.openmetadata.schema.tests.TestSuite;
import org.openmetadata.schema.tests.type.TestCaseResolutionStatus;
import org.openmetadata.schema.type.EntityReference;
import org.openmetadata.schema.type.Include;
import org.openmetadata.service.Entity;
import org.openmetadata.service.search.models.SearchSuggest;

public record TestCaseResolutionStatusIndex(TestCaseResolutionStatus testCaseResolutionStatus)
    implements SearchIndex {
  @Override
  public Map<String, Object> buildSearchIndexDocInternal(Map<String, Object> doc) {
    List<SearchSuggest> suggest = new ArrayList<>();
    suggest.add(
        SearchSuggest.builder()
            .input(testCaseResolutionStatus.getTestCaseReference().getFullyQualifiedName())
            .weight(5)
            .build());
    suggest.add(
        SearchSuggest.builder()
            .input(testCaseResolutionStatus.getTestCaseReference().getName())
            .weight(10)
            .build());
    doc.put(
        "fqnParts",
        getFQNParts(
            testCaseResolutionStatus.getTestCaseReference().getFullyQualifiedName(),
            suggest.stream().map(SearchSuggest::getInput).toList()));
    doc.put("suggest", suggest);
    setParentRelationships(doc);
    return doc;
  }

  @Override
  public Object getEntity() {
    return testCaseResolutionStatus;
  }

  private void setParentRelationships(Map<String, Object> doc) {
    // denormalize the parent relationships for search
    EntityReference testCaseReference = testCaseResolutionStatus.getTestCaseReference();
    TestCase testCase = Entity.getEntityOrNull(testCaseReference, "testSuite", Include.ALL);
    if (testCase == null) return;
    doc.put("testCase", testCase.getEntityReference());
    TestSuite testSuite = Entity.getEntityOrNull(testCase.getTestSuite(), "", Include.ALL);
    if (testSuite == null) return;
    doc.put("testSuite", testSuite.getEntityReference());
    TestSuiteIndex.addTestSuiteParentEntityRelations(testSuite.getExecutableEntityReference(), doc);
  }

  public static Map<String, Float> getFields() {
    Map<String, Float> fields = new HashMap<>();
    fields.put("testCaseResolutionStatusType", 1.0f);
    fields.put("testCaseReference.displayName", 15.0f);
    fields.put("testCaseReference.name", 10.0f);
    fields.put("testCaseReference.description", 1.0f);
    fields.put("testCaseResolutionStatusDetails.resolved.testCaseFailureComment", 10.0f);
    return fields;
  }
}
