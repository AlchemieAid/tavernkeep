'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  UserPlus, 
  UserMinus,
  Crown,
  Settings,
  Database,
  AlertCircle
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface AdminUser {
  userId: string
  role: string
  grantedAt: string
  grantedBy: string | null
  isActive: boolean
}

interface AdminUserManagerProps {
  initialUsers: AdminUser[]
  currentUserId: string
}

const roleIcons: Record<string, any> = {
  super_admin: Crown,
  config_admin: Settings,
  data_admin: Database,
}

const roleColors: Record<string, string> = {
  super_admin: 'bg-ember/20 text-ember border-ember/30',
  config_admin: 'bg-gold/20 text-gold border-gold/30',
  data_admin: 'bg-parchment/20 text-parchment border-parchment/30',
}

const roleDescriptions: Record<string, string> = {
  super_admin: 'Full system access - can manage all settings, data, and users',
  config_admin: 'Can modify application configuration and settings',
  data_admin: 'Can view and edit database records',
}

export function AdminUserManager({ initialUsers, currentUserId }: AdminUserManagerProps) {
  const [users, setUsers] = useState(initialUsers)
  const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false)
  const [newUserId, setNewUserId] = useState('')
  const [newUserRole, setNewUserRole] = useState<string>('config_admin')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGrantRole = async () => {
    if (!newUserId.trim()) {
      alert('Please enter a user ID')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/users/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: newUserId.trim(),
          role: newUserRole,
          notes: notes.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to grant role')
      }

      window.location.reload()
    } catch (error) {
      console.error('Error granting role:', error)
      alert(error instanceof Error ? error.message : 'Failed to grant admin role')
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeRole = async (userId: string, role: string) => {
    if (userId === currentUserId) {
      alert('You cannot revoke your own admin access')
      return
    }

    if (!confirm(`Are you sure you want to revoke ${role} access from this user?`)) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/users/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to revoke role')
      }

      window.location.reload()
    } catch (error) {
      console.error('Error revoking role:', error)
      alert(error instanceof Error ? error.message : 'Failed to revoke admin role')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-on-surface">
                <Shield className="h-5 w-5 text-gold" />
                Active Administrators
              </CardTitle>
              <CardDescription className="text-on-surface-variant">
                Users with administrative access to the system
              </CardDescription>
            </div>
            
            <Dialog open={isGrantDialogOpen} onOpenChange={setIsGrantDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Grant Access
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Grant Admin Access</DialogTitle>
                  <DialogDescription>
                    Provide administrative privileges to a user
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="userId">User ID</Label>
                    <Input
                      id="userId"
                      placeholder="Enter user UUID"
                      value={newUserId}
                      onChange={(e) => setNewUserId(e.target.value)}
                      className="bg-surface-container border-outline"
                    />
                    <p className="text-xs text-on-surface-variant">
                      The UUID of the user from Supabase Auth
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Admin Role</Label>
                    <Select value={newUserRole} onValueChange={setNewUserRole}>
                      <SelectTrigger id="role" className="bg-surface-container border-outline">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">
                          <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4 text-ember" />
                            Super Admin
                          </div>
                        </SelectItem>
                        <SelectItem value="config_admin">
                          <div className="flex items-center gap-2">
                            <Settings className="h-4 w-4 text-gold" />
                            Config Admin
                          </div>
                        </SelectItem>
                        <SelectItem value="data_admin">
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-parchment" />
                            Data Admin
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-on-surface-variant">
                      {roleDescriptions[newUserRole]}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Input
                      id="notes"
                      placeholder="Reason for granting access..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="bg-surface-container border-outline"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsGrantDialogOpen(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleGrantRole} disabled={loading}>
                    {loading ? 'Granting...' : 'Grant Access'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.length === 0 ? (
              <div className="text-center py-8 text-on-surface-variant">
                No admin users found
              </div>
            ) : (
              users.map((user) => {
                const Icon = roleIcons[user.role] || Shield
                const colorClass = roleColors[user.role] || 'bg-surface-container text-on-surface-variant'
                const isCurrentUser = user.userId === currentUserId

                return (
                  <div
                    key={`${user.userId}-${user.role}`}
                    className="flex items-center justify-between p-4 border border-outline rounded-lg hover:border-outline-variant transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-sm font-mono text-on-surface">
                            {user.userId}
                          </code>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={colorClass}>
                            {user.role.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-xs text-on-surface-variant">
                            Granted {new Date(user.grantedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeRole(user.userId, user.role)}
                      disabled={loading || isCurrentUser}
                      className="text-error hover:text-error hover:bg-error/10"
                    >
                      <UserMinus className="h-4 w-4 mr-1" />
                      Revoke
                    </Button>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-gold/30 bg-gold/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gold">
            <AlertCircle className="h-5 w-5" />
            Important Security Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-on-surface-variant space-y-2">
          <ul className="list-disc list-inside space-y-1">
            <li>Only grant admin access to trusted users</li>
            <li>Super admins have full system access including user management</li>
            <li>Config admins can modify application settings and feature flags</li>
            <li>Data admins can view and edit database records</li>
            <li>All admin actions are logged in the audit trail</li>
            <li>You cannot revoke your own admin access</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
