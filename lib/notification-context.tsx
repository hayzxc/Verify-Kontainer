"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useAuth } from "./auth-context"

export interface Notification {
    id: number
    userId: string
    type: string
    title: string
    message: string
    read: boolean
    inspectionId: number | null
    createdAt: string
    inspection?: {
        id: number
        shipperName: string
        status: string
    }
}

interface NotificationContextType {
    notifications: Notification[]
    unreadCount: number
    loading: boolean
    refresh: () => Promise<void>
    markAsRead: (id: number) => Promise<void>
    markAllAsRead: () => Promise<void>
    deleteNotification: (id: number) => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated } = useAuth()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(false)

    const refresh = useCallback(async () => {
        if (!isAuthenticated) return

        try {
            setLoading(true)
            const res = await fetch("/api/notifications", { credentials: "include" })
            if (res.ok) {
                const data = await res.json()
                setNotifications(data.notifications)
                setUnreadCount(data.unreadCount)
            }
        } catch (error) {
            console.error("Failed to fetch notifications:", error)
        } finally {
            setLoading(false)
        }
    }, [isAuthenticated])

    const markAsRead = async (id: number) => {
        try {
            const res = await fetch(`/api/notifications/${id}`, {
                method: "PATCH",
                credentials: "include"
            })
            if (res.ok) {
                setNotifications(prev => {
                    const updated = prev.map(n => n.id === id ? { ...n, read: true } : n)
                    setUnreadCount(updated.filter(n => !n.read).length)
                    return updated
                })
            }
        } catch (error) {
            console.error("Failed to mark notification as read:", error)
        }
    }

    const markAllAsRead = async () => {
        try {
            const res = await fetch("/api/notifications/mark-all-read", {
                method: "POST",
                credentials: "include"
            })
            if (res.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, read: true })))
                setUnreadCount(0)
            }
        } catch (error) {
            console.error("Failed to mark all as read:", error)
        }
    }

    const deleteNotification = async (id: number) => {
        try {
            const res = await fetch(`/api/notifications/${id}`, {
                method: "DELETE",
                credentials: "include"
            })
            if (res.ok) {
                const notif = notifications.find(n => n.id === id)
                setNotifications(prev => prev.filter(n => n.id !== id))
                if (notif && !notif.read) {
                    setUnreadCount(prev => Math.max(0, prev - 1))
                }
            }
        } catch (error) {
            console.error("Failed to delete notification:", error)
        }
    }

    // Initial fetch and polling
    useEffect(() => {
        if (isAuthenticated) {
            refresh()

            // Poll every 30 seconds
            const interval = setInterval(refresh, 30000)

            // Refresh on window focus
            const handleFocus = () => refresh()
            window.addEventListener("focus", handleFocus)

            return () => {
                clearInterval(interval)
                window.removeEventListener("focus", handleFocus)
            }
        }
    }, [isAuthenticated, refresh])

    // Reset when user logs out
    useEffect(() => {
        if (!user) {
            setNotifications([])
            setUnreadCount(0)
        }
    }, [user])

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            loading,
            refresh,
            markAsRead,
            markAllAsRead,
            deleteNotification
        }}>
            {children}
        </NotificationContext.Provider>
    )
}

export function useNotifications() {
    const context = useContext(NotificationContext)
    if (context === undefined) {
        throw new Error("useNotifications must be used within NotificationProvider")
    }
    return context
}
