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
  getConfigsByCategory,
  updateConfig,
  createConfig,
  deleteConfig,
  invalidateConfigCache,
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
