/**
 * Admin System - Central Export
 * 
 * @fileoverview
 * Central export point for all admin functionality.
 * Provides authentication, configuration, and audit logging.
 * 
 * @module admin
 */

// Authentication and authorization
export {
  type AdminRole,
  type AdminStatus,
  checkAdminStatus,
  requireAdmin,
  isSuperAdmin,
  isAdmin,
  getAllAdminUsers,
  grantAdminRole,
  revokeAdminRole,
} from './auth'

// Configuration management
export {
  getConfig,
  getConfigRaw,
  getConfigsByCategory,
  updateConfig,
  createConfig,
  deleteConfig,
  invalidateConfigCache,
  invalidateAllConfigCache,
  getConfigHistory,
  rollbackConfig,
  getCacheStats,
} from './config'

// Audit logging
export {
  type AdminAction,
  logAdminAction,
  getAuditLog,
  getAuditStats,
} from './audit'

// Service-role client + schema registry
export {
  createAdminClient,
  isAdminClientConfigured,
} from './supabase-admin'
export {
  type TableCategory,
  type TableMetadata,
  TABLE_REGISTRY,
  getTableMetadata,
  resolveTableMetadata,
  discoverTables,
  groupByCategory,
} from './schema-registry'

// Config schemas
export {
  type ConfigWidgetKind,
  type KnownConfigKey,
  type ConfigValue,
  CONFIG_SCHEMAS,
  validateConfigValue,
  getConfigWidgetKind,
  getConfigDefault,
} from './config-schemas'
