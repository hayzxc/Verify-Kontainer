declare module '@vercel/analytics/react' {
    import React from 'react';
    export interface AnalyticsProps {
        beforeSend?: (event: any) => any | null;
        debug?: boolean;
        mode?: 'auto' | 'production' | 'development';
    }
    export const Analytics: React.FC<AnalyticsProps>;
}
