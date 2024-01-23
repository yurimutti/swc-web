import { prismaClient } from '@/utils/server/prismaClient'
import { UserActionOptInType, UserActionType } from '@prisma/client'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'
import { getLogger } from '@/utils/shared/logger'
import { getOrCreateSessionIdToSendBackToPartner } from '@/utils/server/verifiedSWCPartner/getOrCreateSessionIdToSendBackToPartner'
import { getUserAttributionFieldsForVerifiedSWCPartner } from '@/utils/server/verifiedSWCPartner/attribution'
import {
  VerifiedSWCPartner,
  VerifiedSWCPartnerApiResponse,
} from '@/utils/server/verifiedSWCPartner/constants'
import { UserActionOptInCampaignName } from '@/utils/shared/userActionCampaigns'
import { zodPhoneNumber } from '@/validation/fields/zodPhoneNumber'
import { normalizePhoneNumber } from '@/utils/shared/phoneNumber'
import { getServerAnalytics, getServerPeopleAnalytics } from '@/utils/server/serverAnalytics'
import { getLocalUserFromUser } from '@/utils/server/serverLocalUser'
import { mapPersistedLocalUserToAnalyticsProperties } from '@/utils/shared/localUser'

export const zodVerifiedSWCPartnersUserActionOptIn = z.object({
  emailAddress: z.string().email().toLowerCase().trim(),
  optInType: z.nativeEnum(UserActionOptInType),
  campaignName: z.string(),
  isVerifiedEmailAddress: z.boolean(),
  fullName: z.string().trim().optional(),
  phoneNumber: zodPhoneNumber.optional().transform(str => str && normalizePhoneNumber(str)),
  hasOptedInToReceiveSMSFromSWC: z.boolean().optional(),
})

const logger = getLogger('verifiedSWCPartnersUserActionOptIn')

export enum VerifiedSWCPartnersUserActionOptInResult {
  NEW_ACTION = 'new-action',
  EXISTING_ACTION = 'existing-action',
}

export async function verifiedSWCPartnersUserActionOptIn({
  emailAddress,
  optInType,
  isVerifiedEmailAddress,
  campaignName,
  partner,
  fullName,
  phoneNumber,
}: z.infer<typeof zodVerifiedSWCPartnersUserActionOptIn> & {
  partner: VerifiedSWCPartner
}): Promise<VerifiedSWCPartnerApiResponse<VerifiedSWCPartnersUserActionOptInResult>> {
  const actionType = UserActionType.OPT_IN
  const existingAction = await prismaClient.userAction.findFirst({
    include: {
      user: {
        include: {
          userEmailAddresses: true,
          userSessions: true,
        },
      },
    },
    where: {
      actionType,
      userActionOptIn: {
        optInType,
      },
      user: {
        userEmailAddresses: {
          some: { emailAddress: emailAddress },
        },
      },
    },
  })
  const user =
    existingAction?.user ||
    (await prismaClient.user.create({
      include: {
        userEmailAddresses: true,
        userSessions: true,
      },
      data: {
        ...getUserAttributionFieldsForVerifiedSWCPartner({ partner, campaignName }),
        userSessions: {
          create: {},
        },
        isPubliclyVisible: false,
        fullName: fullName,
        phoneNumber: phoneNumber,
        // TODO
        //   hasOptedInToReceiveSMS: hasOptedInToReceiveSMSFromSWC,
      },
    }))
  const localUser = getLocalUserFromUser(user)
  const analytics = getServerAnalytics({ userId: user.id, localUser })
  const peopleAnalytics = getServerPeopleAnalytics({ userId: user.id, localUser })
  if (!existingAction?.user) {
    peopleAnalytics.setOnce(mapPersistedLocalUserToAnalyticsProperties(localUser.persisted))
  }
  const existingEmail = user.userEmailAddresses.find(email => email.emailAddress === emailAddress)
  if (existingEmail && !existingEmail.isVerified && isVerifiedEmailAddress) {
    logger.info(`verifying previously unverified email`)
    analytics.track('Email Verified', { creationMethod: 'Verified SWC Partner' })
    await prismaClient.userEmailAddress.update({
      where: { id: existingEmail.id },
      data: { isVerified: true },
    })
  }
  if (existingAction) {
    Sentry.captureMessage('verifiedSWCPartnersUserActionOptIn action already exists', {
      extra: { emailAddress, isVerifiedEmailAddress },
      tags: { optInType, actionType },
    })
    analytics.trackUserActionCreatedIgnored({
      actionType,
      campaignName,
      creationMethod: 'Verified SWC Partner',
      reason: 'Already Exists',
    })
    return {
      result: VerifiedSWCPartnersUserActionOptInResult.EXISTING_ACTION,
      resultOptions: Object.values(VerifiedSWCPartnersUserActionOptInResult),
      sessionId: await getOrCreateSessionIdToSendBackToPartner(existingAction.user),
      userId: existingAction.user.id,
    }
  }
  const userAction = await prismaClient.userAction.create({
    include: {
      user: {
        include: {
          userSessions: true,
        },
      },
    },
    data: {
      actionType,
      campaignName: UserActionOptInCampaignName.DEFAULT,
      userActionOptIn: {
        create: {
          optInType,
        },
      },
      user: user
        ? { connect: { id: user.id } }
        : {
            create: {
              ...getUserAttributionFieldsForVerifiedSWCPartner({ partner, campaignName }),
              userSessions: {
                create: {},
              },
              isPubliclyVisible: false,
              fullName: fullName,
              phoneNumber: phoneNumber,
              // TODO
              //   hasOptedInToReceiveSMS: hasOptedInToReceiveSMSFromSWC,
            },
          },
    },
  })

  analytics.trackUserActionCreated({
    actionType,
    campaignName,
    creationMethod: 'Verified SWC Partner',
  })

  // TODO send user to capital canary

  return {
    result: VerifiedSWCPartnersUserActionOptInResult.NEW_ACTION,
    resultOptions: Object.values(VerifiedSWCPartnersUserActionOptInResult),
    sessionId: await getOrCreateSessionIdToSendBackToPartner(userAction.user),
    userId: userAction.user.id,
  }
}
