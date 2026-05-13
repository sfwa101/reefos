/** Admin SDUI public surface. */
export * from "./schemas";
export { renderAdminBlock } from "./registry";
export { AdminBlockRenderer } from "./components/AdminBlockRenderer";
export { AdminEmptyState } from "./components/AdminEmptyState";
export { AdminTableEngine } from "./engine/AdminTableEngine";
export { AdminFormEngine } from "./engine/AdminFormEngine";
export { useEntityDefinition } from "./hooks/useEntityDefinition";
export { useEntityList, ENTITY_PAGE_SIZE } from "./hooks/useEntityList";
export { useEntityRecord } from "./hooks/useEntityRecord";
export { useEntityMutation } from "./hooks/useEntityMutation";
export { useAdminNavigation } from "./hooks/useAdminNavigation";
export { useAdminAction } from "./hooks/useAdminAction";
export { useSchemaRollback } from "./hooks/useSchemaRollback";
export { AdminErrorBoundary } from "./components/AdminErrorBoundary";
