'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Search, 
  Database,
  ChevronRight,
  Table as TableIcon,
  RefreshCw
} from 'lucide-react'

interface TableInfo {
  name: string
  label: string
  icon: string
  count: number
}

interface DataBrowserProps {
  tables: TableInfo[]
}

export function DataBrowser({ tables }: DataBrowserProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null)
  const [tableData, setTableData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const filteredTables = tables.filter(table =>
    table.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const loadTableData = async (table: TableInfo) => {
    setLoading(true)
    setSelectedTable(table)
    
    try {
      const response = await fetch(`/api/admin/data/${table.name}`)
      if (!response.ok) throw new Error('Failed to load data')
      
      const data = await response.json()
      setTableData(data.records || [])
    } catch (error) {
      console.error('Error loading table data:', error)
      alert('Failed to load table data')
    } finally {
      setLoading(false)
    }
  }

  const formatValue = (value: any): string => {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 50) + '...'
    }
    return String(value)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="bg-white border-slate-200 shadow-sm lg:col-span-1">
        <CardHeader className="bg-white border-slate-200 shadow-sm">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Tables
          </CardTitle>
          <CardDescription>Select a table to browse</CardDescription>
        </CardHeader>
        <CardContent className="bg-white border-slate-200 shadow-sm">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="space-y-1 max-h-[600px] overflow-y-auto">
              {filteredTables.map((table) => (
                <button
                  key={table.name}
                  onClick={() => loadTableData(table)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                    selectedTable?.name === table.name
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'hover:bg-gray-50 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{table.icon}</span>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">{table.label}</div>
                      <div className="text-xs text-gray-500">{table.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{table.count.toLocaleString()}</Badge>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-slate-200 shadow-sm lg:col-span-2">
        <CardHeader className="bg-white border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TableIcon className="h-5 w-5" />
                {selectedTable ? selectedTable.label : 'Select a Table'}
              </CardTitle>
              <CardDescription>
                {selectedTable
                  ? `Viewing ${tableData.length} records from ${selectedTable.name}`
                  : 'Choose a table from the left to view its data'}
              </CardDescription>
            </div>
            {selectedTable && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadTableData(selectedTable)}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="bg-white border-slate-200 shadow-sm">
          {!selectedTable ? (
            <div className="text-center py-12 text-gray-500">
              <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Select a table to view its data</p>
            </div>
          ) : loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 mx-auto mb-4 text-blue-500 animate-spin" />
              <p className="text-gray-600">Loading data...</p>
            </div>
          ) : tableData.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <TableIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No records found in this table</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {Object.keys(tableData[0] || {}).map((key) => (
                        <th
                          key={key}
                          className="text-left p-3 font-semibold text-gray-700 bg-gray-50"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.slice(0, 50).map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        {Object.entries(row).map(([key, value]) => (
                          <td key={key} className="p-3 text-gray-900">
                            {typeof value === 'object' && value !== null ? (
                              <details className="cursor-pointer">
                                <summary className="text-blue-600 hover:text-blue-700">
                                  View JSON
                                </summary>
                                <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                  {JSON.stringify(value, null, 2)}
                                </pre>
                              </details>
                            ) : (
                              <span className={value === null ? 'text-gray-400 italic' : ''}>
                                {formatValue(value)}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {tableData.length > 50 && (
                <div className="text-center text-sm text-gray-500 py-4 border-t">
                  Showing first 50 of {tableData.length} records
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
