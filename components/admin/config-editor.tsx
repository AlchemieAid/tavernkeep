'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  Zap, 
  Database, 
  Cpu, 
  Save,
  RotateCcw,
  Edit,
  Check,
  X
} from 'lucide-react'

interface Config {
  id: string
  key: string
  value: any
  description: string | null
  category: string
  version: number
  updated_at: string
}

interface ConfigEditorProps {
  configs: Record<string, Config[]>
}

const categoryIcons: Record<string, any> = {
  rate_limits: Zap,
  features: Settings,
  ai: Cpu,
  system: Database,
  field_limits: Database,
}

const categoryColors: Record<string, string> = {
  rate_limits: 'text-yellow-600 bg-yellow-100',
  features: 'text-blue-600 bg-blue-100',
  ai: 'text-purple-600 bg-purple-100',
  system: 'text-gray-600 bg-gray-100',
  field_limits: 'text-green-600 bg-green-100',
}

export function ConfigEditor({ configs }: ConfigEditorProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const handleEdit = (config: Config) => {
    setEditingKey(config.key)
    setEditValue(JSON.stringify(config.value, null, 2))
  }

  const handleCancel = () => {
    setEditingKey(null)
    setEditValue('')
  }

  const handleSave = async (config: Config) => {
    setSaving(true)
    try {
      const parsedValue = JSON.parse(editValue)
      
      const response = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: config.key,
          value: parsedValue,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update config')
      }

      window.location.reload()
    } catch (error) {
      console.error('Error saving config:', error)
      alert('Failed to save configuration. Please check the JSON format.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {Object.entries(configs).map(([category, categoryConfigs]) => {
        const Icon = categoryIcons[category] || Settings
        const colorClass = categoryColors[category] || 'text-gray-600 bg-gray-100'

        return (
          <Card key={category} className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="capitalize">{category.replace(/_/g, ' ')}</span>
                <Badge variant="secondary">{categoryConfigs.length}</Badge>
              </CardTitle>
              <CardDescription>
                {category === 'rate_limits' && 'Control API rate limiting for generation endpoints'}
                {category === 'features' && 'Enable or disable application features'}
                {category === 'ai' && 'Configure AI model settings and behavior'}
                {category === 'system' && 'System-wide configuration options'}
                {category === 'field_limits' && 'Field length and size constraints'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryConfigs.map((config) => {
                  const isEditing = editingKey === config.key
                  const displayValue = typeof config.value === 'object' 
                    ? JSON.stringify(config.value, null, 2)
                    : String(config.value)

                  return (
                    <div key={config.key} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-sm font-mono text-gray-900">{config.key}</code>
                            <Badge variant="outline" className="text-xs">
                              v{config.version}
                            </Badge>
                          </div>
                          {config.description && (
                            <p className="text-sm text-gray-600">{config.description}</p>
                          )}
                        </div>
                        
                        {!isEditing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(config)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-3">
                          <Textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="font-mono text-sm"
                            rows={6}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSave(config)}
                              disabled={saving}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancel}
                              disabled={saving}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <pre className="bg-gray-50 p-3 rounded text-sm font-mono overflow-x-auto">
                          {displayValue}
                        </pre>
                      )}

                      <div className="mt-2 text-xs text-gray-500">
                        Last updated: {new Date(config.updated_at).toLocaleString()}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
