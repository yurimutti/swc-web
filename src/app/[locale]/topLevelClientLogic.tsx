'use client'
import { requiredEnv } from '@/utils/shared/requiredEnv'
import { NEXT_PUBLIC_THIRDWEB_AUTH_DOMAIN } from '@/utils/shared/sharedEnv'
import * as Sentry from '@sentry/nextjs'
import { Base } from '@thirdweb-dev/chains'
import {
  ThirdwebProvider,
  coinbaseWallet,
  embeddedWallet,
  en,
  metamaskWallet,
  walletConnect,
} from '@thirdweb-dev/react'

import { useAuthUser } from '@/hooks/useAuthUser'
import { useDetectWipedDatabaseAndLogOutUser } from '@/hooks/useDetectWipedDatabaseAndLogOutUser'
import { LocaleContext } from '@/hooks/useLocale'
import { SupportedLocale } from '@/intl/locales'
import { AnalyticActionType, AnalyticComponentType } from '@/utils/shared/sharedAnalytics'
import { initClientAnalytics, trackClientAnalytic } from '@/utils/web/clientAnalytics'
import { bootstrapLocalUser } from '@/utils/web/clientLocalUser'
import { getUserSessionIdOnClient } from '@/utils/web/clientUserSessionId'
import { identifyUserOnClient } from '@/utils/web/identifyUser'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

const NEXT_PUBLIC_THIRDWEB_CLIENT_ID = requiredEnv(
  process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID,
  'process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID',
)

const InitialOrchestration = () => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const authUser = useAuthUser()
  useDetectWipedDatabaseAndLogOutUser()
  // Note, in local dev this component will double render. It doesn't do this after it is built (verify in testing)
  useEffect(() => {
    bootstrapLocalUser()
    initClientAnalytics()
    const sessionId = getUserSessionIdOnClient()
    Sentry.setUser({ id: sessionId, idType: 'session' })
  }, [])
  const searchParamsUserId = searchParams?.get('userId')
  useEffect(() => {
    if (authUser.user || searchParamsUserId) {
      identifyUserOnClient(authUser.user || { userId: searchParamsUserId! })
    }
    if (authUser.user && searchParamsUserId && authUser.user.userId !== searchParamsUserId) {
      Sentry.captureMessage('mismatch between authenticated user and userId in search param', {
        extra: {
          authUser: authUser.user,
          searchParamsUserId,
        },
      })
    }
  }, [authUser.user, searchParamsUserId])
  useEffect(() => {
    if (!pathname) {
      return
    }
    trackClientAnalytic('Page Visited', {
      pathname,
      component: AnalyticComponentType.page,
      action: AnalyticActionType.view,
    })
  }, [pathname])
  return null
}

// This component includes all top level client-side logic
export function TopLevelClientLogic({
  children,
  locale,
}: {
  children: React.ReactNode
  locale: SupportedLocale
}) {
  return (
    <LocaleContext.Provider value={locale}>
      <ThirdwebProvider
        activeChain={Base}
        authConfig={{
          domain: NEXT_PUBLIC_THIRDWEB_AUTH_DOMAIN,
          authUrl: '/api/auth',
        }}
        clientId={NEXT_PUBLIC_THIRDWEB_CLIENT_ID}
        locale={en()}
        supportedWallets={[
          metamaskWallet(),
          coinbaseWallet({ recommended: true }),
          walletConnect(),
          embeddedWallet({
            auth: {
              options: ['google', 'email'],
            },
          }),
        ]}
      >
        {/* https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout */}
        <Suspense>
          <InitialOrchestration />
        </Suspense>
        {children}
      </ThirdwebProvider>
    </LocaleContext.Provider>
  )
}
