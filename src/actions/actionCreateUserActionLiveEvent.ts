'use server'
import 'server-only'

import { User, UserAction, UserActionType, UserInformationVisibility } from '@prisma/client'
import * as Sentry from '@sentry/nextjs'
import { nativeEnum, object, z } from 'zod'

import { getClientUser } from '@/clientModels/clientUser/clientUser'
import {
  getMaybeUserAndMethodOfMatch,
  UserAndMethodOfMatch,
} from '@/utils/server/getMaybeUserAndMethodOfMatch'
import { claimNFT } from '@/utils/server/nft/claimNFT'
import { prismaClient } from '@/utils/server/prismaClient'
import { throwIfRateLimited } from '@/utils/server/ratelimit/throwIfRateLimited'
import { getServerAnalytics, getServerPeopleAnalytics } from '@/utils/server/serverAnalytics'
import {
  mapLocalUserToUserDatabaseFields,
  parseLocalUserFromCookies,
} from '@/utils/server/serverLocalUser'
import { getUserSessionId } from '@/utils/server/serverUserSessionId'
import { withServerActionMiddleware } from '@/utils/server/withServerActionMiddleware'
import { mapPersistedLocalUserToAnalyticsProperties } from '@/utils/shared/localUser'
import { getLogger } from '@/utils/shared/logger'
import { generateReferralId } from '@/utils/shared/referralId'
import { NEXT_PUBLIC_ENVIRONMENT } from '@/utils/shared/sharedEnv'
import { UserActionLiveEventCampaignName } from '@/utils/shared/userActionCampaigns'

const logger = getLogger(`actionCreateUserActionLiveEvent`)

const createActionLiveEventInputValidationSchema = object({
  campaignName: nativeEnum(UserActionLiveEventCampaignName),
})

export type CreateActionLiveEventInput = z.infer<typeof createActionLiveEventInputValidationSchema>

interface SharedDependencies {
  localUser: ReturnType<typeof parseLocalUserFromCookies>
  sessionId: ReturnType<typeof getUserSessionId>
  analytics: ReturnType<typeof getServerAnalytics>
  peopleAnalytics: ReturnType<typeof getServerPeopleAnalytics>
}

export const actionCreateUserActionLiveEvent = withServerActionMiddleware(
  'actionCreateUserActionLiveEvent',
  _actionCreateUserActionLiveEvent,
)

type EventDuration = {
  START_TIME: Date
  END_TIME: Date
}

const EVENT_DURATION: Record<UserActionLiveEventCampaignName, EventDuration> = {
  [UserActionLiveEventCampaignName['2024_03_04_LA']]: {
    START_TIME: new Date('2024-03-04'),
    END_TIME: new Date('2024-03-06'),
  },
}

async function _actionCreateUserActionLiveEvent(input: CreateActionLiveEventInput) {
  logger.info('triggered')

  const validatedInput = createActionLiveEventInputValidationSchema.safeParse(input)
  if (!validatedInput.success) {
    return {
      errors: validatedInput.error.flatten().fieldErrors,
    }
  }

  if (
    !process.env.NEXT_PUBLIC_BYPASS_LIVE_EVENT_DURATION_CHECK &&
    NEXT_PUBLIC_ENVIRONMENT === 'production'
  ) {
    const currentTime = Date.now()
    const eventDuration = EVENT_DURATION[validatedInput.data.campaignName]
    if (
      currentTime < eventDuration.START_TIME.getTime() ||
      currentTime > eventDuration.END_TIME.getTime()
    ) {
      return {
        errors: {
          campaignName: ['The campaign is not active'],
        },
      }
    }
  }

  const localUser = parseLocalUserFromCookies()
  const sessionId = getUserSessionId()

  const userMatch = await getMaybeUserAndMethodOfMatch({
    prisma: { include: { primaryUserCryptoAddress: true, address: true } },
  })
  await throwIfRateLimited()

  const user = userMatch.user || (await createUser({ localUser, sessionId }))

  const peopleAnalytics = getServerPeopleAnalytics({
    localUser,
    userId: user.id,
  })
  const analytics = getServerAnalytics({
    userId: user.id,
    localUser,
  })

  const recentUserAction = await getRecentUserActionByUserId(user.id, validatedInput)
  if (recentUserAction) {
    await logSpamActionSubmissions({
      validatedInput,
      userAction: recentUserAction,
      userId: user.id,
      sharedDependencies: { analytics },
    })
    return { user: getClientUser(user) }
  }

  const { userAction } = await createAction({
    user,
    isNewUser: !userMatch.user,
    validatedInput: validatedInput.data,
    userMatch,
    sharedDependencies: { sessionId, analytics, peopleAnalytics },
  })

  if (user.primaryUserCryptoAddress !== null) {
    await claimNFT(userAction, user.primaryUserCryptoAddress)
  }

  return { user: getClientUser(user) }
}

async function createUser(sharedDependencies: Pick<SharedDependencies, 'localUser' | 'sessionId'>) {
  const { localUser, sessionId } = sharedDependencies
  const createdUser = await prismaClient.user.create({
    data: {
      informationVisibility: UserInformationVisibility.ANONYMOUS,
      userSessions: { create: { id: sessionId } },
      hasOptedInToEmails: false,
      hasOptedInToMembership: false,
      hasOptedInToSms: false,
      referralId: generateReferralId(),
      ...mapLocalUserToUserDatabaseFields(localUser),
    },
    include: {
      primaryUserCryptoAddress: true,
      address: true,
    },
  })
  logger.info('created user')

  if (localUser?.persisted) {
    await getServerPeopleAnalytics({ localUser, userId: createdUser.id }).setOnce(
      mapPersistedLocalUserToAnalyticsProperties(localUser.persisted),
    )
  }

  return createdUser
}

async function getRecentUserActionByUserId(
  userId: User['id'],
  validatedInput: z.SafeParseSuccess<CreateActionLiveEventInput>,
) {
  return prismaClient.userAction.findFirst({
    where: {
      actionType: UserActionType.LIVE_EVENT,
      campaignName: validatedInput.data.campaignName,
      userId: userId,
    },
  })
}

async function logSpamActionSubmissions({
  validatedInput,
  userAction,
  userId,
  sharedDependencies,
}: {
  validatedInput: z.SafeParseSuccess<CreateActionLiveEventInput>
  userAction: UserAction
  userId: User['id']
  sharedDependencies: Pick<SharedDependencies, 'analytics'>
}) {
  await sharedDependencies.analytics.trackUserActionCreatedIgnored({
    actionType: UserActionType.LIVE_EVENT,
    campaignName: validatedInput.data.campaignName,
    reason: 'Too Many Recent',
    userState: 'Existing',
  })
  Sentry.captureMessage(`duplicate ${UserActionType.LIVE_EVENT} user action submitted`, {
    extra: { validatedInput: validatedInput.data, userAction },
    user: { id: userId },
  })
}

async function createAction<U extends User>({
  user,
  validatedInput,
  userMatch,
  sharedDependencies,
  isNewUser,
}: {
  user: U
  isNewUser: boolean
  validatedInput: CreateActionLiveEventInput
  userMatch: UserAndMethodOfMatch
  sharedDependencies: Pick<SharedDependencies, 'sessionId' | 'analytics' | 'peopleAnalytics'>
}) {
  const userAction = await prismaClient.userAction.create({
    data: {
      user: { connect: { id: user.id } },
      actionType: UserActionType.LIVE_EVENT,
      campaignName: validatedInput.campaignName,
      ...('userCryptoAddress' in userMatch
        ? {
            userCryptoAddress: { connect: { id: userMatch.userCryptoAddress.id } },
          }
        : { userSession: { connect: { id: sharedDependencies.sessionId } } }),
    },
  })

  logger.info('created user action')

  await sharedDependencies.analytics.trackUserActionCreated({
    actionType: UserActionType.LIVE_EVENT,
    campaignName: validatedInput.campaignName,
    userState: isNewUser ? 'New' : 'Existing',
  })

  return { userAction }
}