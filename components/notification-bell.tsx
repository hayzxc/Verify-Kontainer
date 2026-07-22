"use client"

import { useState } from "react"
import { Bell, Check, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useNotifications } from "@/lib/notification-context"
import { formatDistanceToNow } from "date-fns"

export function NotificationBell() {
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, refresh } = useNotifications()
    const [open, setOpen] = useState(false)

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "inspection_submitted":
                return "📋"
            case "inspection_approved":
                return "✅"
            case "correction_requested":
                return "⚠️"
            default:
                return "🔔"
        }
    }

    const getTypeBadgeVariant = (type: string) => {
        switch (type) {
            case "inspection_submitted":
                return "secondary"
            case "inspection_approved":
                return "default"
            case "correction_requested":
                return "destructive"
            default:
                return "outline"
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                        >
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-3 border-b">
                    <h4 className="font-semibold">Notifications</h4>
                    <div className="flex gap-1">
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAllAsRead()}
                                className="text-xs h-7"
                            >
                                <Check className="h-3 w-3 mr-1" />
                                Mark all read
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => refresh()}
                            className="h-7 w-7"
                            disabled={loading}
                        >
                            <svg
                                className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                            </svg>
                        </Button>
                    </div>
                </div>
                <ScrollArea className="h-80">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-6 text-muted-foreground">
                            <Bell className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">No notifications yet</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-3 hover:bg-muted/50 transition-colors ${!notification.read ? "bg-primary/5" : ""
                                        }`}
                                >
                                    <div className="flex gap-2">
                                        <span className="text-lg">{getTypeIcon(notification.type)}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-1">
                                                <p className="font-medium text-sm truncate">
                                                    {notification.title}
                                                </p>
                                                <div className="flex gap-1 shrink-0">
                                                    {!notification.read && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                markAsRead(notification.id)
                                                            }}
                                                        >
                                                            <Check className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            deleteNotification(notification.id)
                                                        }}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {notification.message}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Badge variant={getTypeBadgeVariant(notification.type) as any} className="text-[10px] px-1.5 py-0">
                                                    {notification.type.replace(/_/g, " ")}
                                                </Badge>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
}
