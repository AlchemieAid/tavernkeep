'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Filter,
  CheckCircle,
  XCircle,
  Settings,
  Database,
  Users,
  Shield,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AuditLogEntry {
  id: string
  adminUserId: string
  action: string
  entityType: string
  entityId: string | null
  oldValue: any
  newValue: any
  ipAddress: string | null
  userAgent: string | null
  success: boolean
  errorMessage: string | null
  createdAt: string
}

interface AuditLogViewerProps {
  initialLogs: AuditLogEntry[]
}

const actionIcons: Record<string, any> = {
  config_update: Settings,
  config_create: Settings,
  config_delete: Settings,
  data_create: Database,
  data_update: Database,
  data_delete: Database,
  admin_grant: Users,
  admin_revoke: Users,
  cache_clear: Database,
}

const actionColors: Record<string, string> = {
  config_update: 'bg-gold/20 text-gold',
  config_create: 'bg-parchment/20 text-parchment',
  config_delete: 'bg-error/20 text-error',
  data_create: 'bg-parchment/20 text-parchment',
  data_update: 'bg-gold/20 text-gold',
  data_delete: 'bg-error/20 text-error',
  admin_grant: 'bg-ember/20 text-ember',
  admin_revoke: 'bg-gold-light/20 text-gold-light',
  cache_clear: 'bg-surface-container text-on-surface-variant',
}

export function AuditLogViewer({ initialLogs }: AuditLogViewerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState<string>('all')
  const [filterSuccess, setFilterSuccess] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const uniqueActions = useMemo(() => {
    const actions = new Set(initialLogs.map(log => log.action))
    return Array.from(actions).sort()
  }, [initialLogs])

  const filteredLogs = useMemo(() => {
    return initialLogs.filter(log => {
      const matchesSearch = 
        searchTerm === '' ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.entityId && log.entityId.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesAction = filterAction === 'all' || log.action === filterAction
      const matchesSuccess = 
        filterSuccess === 'all' ||
        (filterSuccess === 'success' && log.success) ||
        (filterSuccess === 'failure' && !log.success)

      return matchesSearch && matchesAction && matchesSuccess
    })
  }, [initialLogs, searchTerm, filterAction, filterSuccess])

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-on-surface">
            <Filter className="h-5 w-5 text-gold" />
            Filters
          </CardTitle>
          <CardDescription className="text-on-surface-variant">Search and filter audit log entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
              <Input
                placeholder="Search actions, entities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-surface-container border-outline"
              />
            </div>

            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger>
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>
                    {action.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterSuccess} onValueChange={setFilterSuccess}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="success">Success only</SelectItem>
                <SelectItem value="failure">Failures only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 text-sm text-on-surface-variant">
            Showing {filteredLogs.length} of {initialLogs.length} entries
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-on-surface-variant">
              No audit log entries found matching your filters
            </CardContent>
          </Card>
        ) : (
          filteredLogs.map((log) => {
            const Icon = actionIcons[log.action] || Shield
            const colorClass = actionColors[log.action] || 'bg-surface-container text-on-surface-variant'
            const isExpanded = expandedId === log.id

            return (
              <Card key={log.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-2 rounded-lg ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={colorClass}>
                            {log.action.replace(/_/g, ' ')}
                          </Badge>
                          {log.success ? (
                            <CheckCircle className="h-4 w-4 text-gold" />
                          ) : (
                            <XCircle className="h-4 w-4 text-error" />
                          )}
                          <span className="text-xs text-on-surface-variant">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <div className="text-sm text-on-surface">
                          <span className="font-medium">{log.entityType}</span>
                          {log.entityId && (
                            <span className="text-on-surface-variant"> · {log.entityId}</span>
                          )}
                        </div>

                        {!log.success && log.errorMessage && (
                          <div className="mt-2 text-sm text-error bg-error/10 p-2 rounded">
                            {log.errorMessage}
                          </div>
                        )}

                        {isExpanded && (
                          <div className="mt-4 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {log.oldValue && (
                                <div>
                                  <div className="text-xs font-semibold text-on-surface-variant mb-1">
                                    Old Value
                                  </div>
                                  <pre className="text-xs bg-surface-container p-2 rounded overflow-x-auto text-on-surface">
                                    {JSON.stringify(log.oldValue, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {log.newValue && (
                                <div>
                                  <div className="text-xs font-semibold text-on-surface-variant mb-1">
                                    New Value
                                  </div>
                                  <pre className="text-xs bg-surface-container p-2 rounded overflow-x-auto text-on-surface">
                                    {JSON.stringify(log.newValue, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs text-on-surface-variant">
                              <div>
                                <span className="font-semibold text-on-surface">Admin User:</span>{' '}
                                {log.adminUserId}
                              </div>
                              {log.ipAddress && (
                                <div>
                                  <span className="font-semibold text-on-surface">IP Address:</span>{' '}
                                  {log.ipAddress}
                                </div>
                              )}
                              {log.userAgent && (
                                <div className="col-span-2">
                                  <span className="font-semibold text-on-surface">User Agent:</span>{' '}
                                  {log.userAgent}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleExpand(log.id)}
                      className="ml-4 p-1 hover:bg-surface-container rounded transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-on-surface-variant" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-on-surface-variant" />
                      )}
                    </button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
