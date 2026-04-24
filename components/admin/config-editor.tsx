'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  Edit,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { getConfigWidgetKind, type ConfigWidgetKind } from '@/lib/admin/config-schemas'

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

type EditorState =
  | { kind: 'json'; raw: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'number'; raw: string }
  | { kind: 'string'; value: string }

function makeEditorState(value: unknown, kind: ConfigWidgetKind): EditorState {
  switch (kind) {
    case 'boolean':
      return { kind: 'boolean', value: Boolean(value) }
    case 'number':
      return { kind: 'number', raw: String(value ?? '') }
    case 'string':
      return { kind: 'string', value: typeof value === 'string' ? value : String(value ?? '') }
    case 'json':
    default:
      return { kind: 'json', raw: JSON.stringify(value, null, 2) }
  }
}

function parseEditorState(state: EditorState): { ok: true; value: unknown } | { ok: false; error: string } {
  switch (state.kind) {
    case 'boolean':
      return { ok: true, value: state.value }
    case 'number': {
      const trimmed = state.raw.trim()
      if (trimmed === '') return { ok: false, error: 'Value is required' }
      const n = Number(trimmed)
      if (!Number.isFinite(n)) return { ok: false, error: 'Must be a number' }
      return { ok: true, value: n }
    }
    case 'string':
      return { ok: true, value: state.value }
    case 'json':
      try {
        return { ok: true, value: JSON.parse(state.raw) }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Invalid JSON' }
      }
  }
}

const categoryIcons: Record<string, any> = {
  rate_limits: Zap,
  features: Settings,
  ai: Cpu,
  system: Database,
  field_limits: Database,
}

const categoryColors: Record<string, string> = {
  rate_limits: 'text-gold bg-gold/20',
  features: 'text-parchment bg-parchment/20',
  ai: 'text-ember bg-ember/20',
  system: 'text-on-surface-variant bg-surface-container',
  field_limits: 'text-gold-light bg-gold-light/20',
}

export function ConfigEditor({ configs }: ConfigEditorProps) {
  const router = useRouter()
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editorState, setEditorState] = useState<EditorState | null>(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<
    { kind: 'error' | 'success'; key: string; message: string } | null
  >(null)
  const [refreshing, setRefreshing] = useState(false)

  const handleEdit = useCallback((config: Config) => {
    const kind = getConfigWidgetKind(config.key)
    setEditingKey(config.key)
    setEditorState(makeEditorState(config.value, kind))
    setFeedback(null)
  }, [])

  const handleCancel = useCallback(() => {
    setEditingKey(null)
    setEditorState(null)
    setFeedback(null)
  }, [])

  const handleSave = useCallback(async (config: Config) => {
    if (!editorState) return
    setSaving(true)
    setFeedback(null)
    try {
      const parsed = parseEditorState(editorState)
      if (!parsed.ok) {
        setFeedback({ kind: 'error', key: config.key, message: parsed.error })
        return
      }

      const response = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: config.key, value: parsed.value }),
      })

      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        setFeedback({
          kind: 'error',
          key: config.key,
          message: body?.error ?? `Save failed (${response.status})`,
        })
        return
      }

      setFeedback({ kind: 'success', key: config.key, message: 'Saved' })
      setEditingKey(null)
      setEditorState(null)
      router.refresh()
    } catch (error) {
      setFeedback({
        kind: 'error',
        key: config.key,
        message: error instanceof Error ? error.message : 'Network error',
      })
    } finally {
      setSaving(false)
    }
  }, [editorState, router])

  const handleRefreshCache = useCallback(async () => {
    setRefreshing(true)
    try {
      const response = await fetch('/api/admin/config', { method: 'DELETE' })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        setFeedback({ kind: 'error', key: '__cache__', message: body?.error ?? 'Cache refresh failed' })
        return
      }
      setFeedback({ kind: 'success', key: '__cache__', message: 'Cache cleared' })
      router.refresh()
    } finally {
      setRefreshing(false)
    }
  }, [router])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-xs text-on-surface-variant">
          Configs are validated against typed schemas. Unknown keys are accepted as raw JSON.
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshCache}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh cache
        </Button>
      </div>

      {feedback?.key === '__cache__' && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg text-sm border ${
            feedback.kind === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.kind === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {feedback.message}
        </div>
      )}

      {Object.entries(configs).map(([category, categoryConfigs]) => {
        const Icon = categoryIcons[category] || Settings
        const colorClass = categoryColors[category] || 'text-gray-600 bg-gray-100'

        return (
          <Card key={category}>
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
                    <div key={config.key} className="border border-outline rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-sm font-mono text-on-surface">{config.key}</code>
                            <Badge variant="outline" className="text-xs">
                              v{config.version}
                            </Badge>
                          </div>
                          {config.description && (
                            <p className="text-sm text-on-surface-variant">{config.description}</p>
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

                      {isEditing && editorState ? (
                        <div className="space-y-3">
                          {editorState.kind === 'boolean' && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant={editorState.value ? 'default' : 'outline'}
                                onClick={() => setEditorState({ kind: 'boolean', value: true })}
                              >
                                On
                              </Button>
                              <Button
                                size="sm"
                                variant={!editorState.value ? 'default' : 'outline'}
                                onClick={() => setEditorState({ kind: 'boolean', value: false })}
                              >
                                Off
                              </Button>
                            </div>
                          )}
                          {editorState.kind === 'number' && (
                            <Input
                              type="number"
                              value={editorState.raw}
                              onChange={(e) => setEditorState({ kind: 'number', raw: e.target.value })}
                              className="font-mono text-sm bg-surface-container border-outline"
                            />
                          )}
                          {editorState.kind === 'string' && (
                            <Input
                              value={editorState.value}
                              onChange={(e) => setEditorState({ kind: 'string', value: e.target.value })}
                              className="font-mono text-sm bg-surface-container border-outline"
                            />
                          )}
                          {editorState.kind === 'json' && (
                            <Textarea
                              value={editorState.raw}
                              onChange={(e) => setEditorState({ kind: 'json', raw: e.target.value })}
                              className="font-mono text-sm bg-surface-container border-outline"
                              rows={6}
                            />
                          )}
                          {feedback?.key === config.key && (
                            <div
                              className={`flex items-center gap-2 text-xs ${
                                feedback.kind === 'success' ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {feedback.kind === 'success' ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                <AlertCircle className="h-3.5 w-3.5" />
                              )}
                              {feedback.message}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSave(config)}
                              disabled={saving}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              {saving ? 'Saving…' : 'Save'}
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
                        <div className="space-y-1">
                          <pre className="bg-surface-container p-3 rounded text-sm font-mono overflow-x-auto text-on-surface">
                            {displayValue}
                          </pre>
                          {feedback?.key === config.key && feedback.kind === 'success' && (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {feedback.message}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-2 text-xs text-on-surface-variant">
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
