import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { appClient } from '@/api/appClient';
import { pagesConfig } from '@/pages.config';

export default function NavigationTracker() {
    const location = useLocation();
    const { isAuthenticated } = useAuth();
    const { Pages, mainPage } = pagesConfig;

    const mainPageKey = mainPage ?? Object.keys(Pages)[0];

    /* ---------------- POST URL TO PARENT ---------------- */
    useEffect(() => {
        window.parent?.postMessage(
            {
                type: "app_changed_url",
                url: window.location.href,
            },
            '*'
        );
    }, [location]);

    /* ---------------- SAFE USER ACTIVITY LOGGING ---------------- */
    useEffect(() => {
        const pathname = location.pathname;

        let pageName;

        if (pathname === '/' || pathname === '') {
            pageName = mainPageKey;
        } else {
            const pathSegment = pathname.replace(/^\//, '').split('/')[0];

            const matchedKey = Object.keys(Pages).find(
                key => key.toLowerCase() === pathSegment.toLowerCase()
            );

            pageName = matchedKey || null;
        }

        // ✅ SAFE GUARD (prevents crash)
        if (
            isAuthenticated &&
            pageName &&
            appClient?.appLogs?.logUserInApp
        ) {
            appClient.appLogs
                .logUserInApp(pageName)
                .catch(() => {});
        }

    }, [location, isAuthenticated, Pages, mainPageKey]);

    return null;
}