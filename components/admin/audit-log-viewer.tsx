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
  config_update: 'bg-blue-100 text-blue-700',
  config_create: 'bg-green-100 text-green-700',
  config_delete: 'bg-red-100 text-red-700',
  data_create: 'bg-green-100 text-green-700',
  data_update: 'bg-blue-100 text-blue-700',
  data_delete: 'bg-red-100 text-red-700',
  admin_grant: 'bg-purple-100 text-purple-700',
  admin_revoke: 'bg-orange-100 text-orange-700',
  cache_clear: 'bg-gray-100 text-gray-700',
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
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Search and filter audit log entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search actions, entities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
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

          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredLogs.length} of {initialLogs.length} entries
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No audit log entries found matching your filters
            </CardContent>
          </Card>
        ) : (
          filteredLogs.map((log) => {
            const Icon = actionIcons[log.action] || Shield
            const colorClass = actionColors[log.action] || 'bg-gray-100 text-gray-700'
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
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-xs text-gray-500">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <div className="text-sm text-gray-900">
                          <span className="font-medium">{log.entityType}</span>
                          {log.entityId && (
                            <span className="text-gray-600"> · {log.entityId}</span>
                          )}
                        </div>

                        {!log.success && log.errorMessage && (
                          <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                            {log.errorMessage}
                          </div>
                        )}

                        {isExpanded && (
                          <div className="mt-4 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {log.oldValue && (
                                <div>
                                  <div className="text-xs font-semibold text-gray-600 mb-1">
                                    Old Value
                                  </div>
                                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                    {JSON.stringify(log.oldValue, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {log.newValue && (
                                <div>
                                  <div className="text-xs font-semibold text-gray-600 mb-1">
                                    New Value
                                  </div>
                                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                    {JSON.stringify(log.newValue, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                              <div>
                                <span className="font-semibold">Admin User:</span>{' '}
                                {log.adminUserId}
                              </div>
                              {log.ipAddress && (
                                <div>
                                  <span className="font-semibold">IP Address:</span>{' '}
                                  {log.ipAddress}
                                </div>
                              )}
                              {log.userAgent && (
                                <div className="col-span-2">
                                  <span className="font-semibold">User Agent:</span>{' '}
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
                      className="ml-4 p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-600" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-600" />
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
