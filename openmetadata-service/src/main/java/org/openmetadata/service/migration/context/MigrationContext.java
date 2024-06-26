package org.openmetadata.service.migration.context;

import java.util.HashMap;
import java.util.List;
import java.util.stream.Stream;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.jdbi.v3.core.Handle;

@Slf4j
public class MigrationContext {

  @Getter private final String version;
  @Getter private final List<MigrationOps> migrationOps;
  private final Handle handle;
  // Key is the Ops name and value the computed result
  @Getter private final HashMap<String, Long> results = new HashMap<>();

  public MigrationContext(String version, List<MigrationOps> migrationOps, Handle handle) {
    this.version = version;
    this.migrationOps =
        Stream.concat(migrationOps.stream(), CommonMigrationOps.getCommonOps().stream()).toList();
    this.handle = handle;
  }

  public void compute() {
    migrationOps.forEach(
        ops -> {
          ops.compute(handle);
          results.put(ops.getName(), ops.getResult());
        });
  }

  public void show() {
    LOG.debug(String.format("Version [%s] context is [%s]", version, results));
  }
}
