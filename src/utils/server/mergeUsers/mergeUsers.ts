import { prismaClient } from '@/utils/server/prismaClient'
import { getLogger } from '@/utils/shared/logger'
import { Prisma } from '@prisma/client'
import { MERGE_EMAIL_SOURCE_PRIORITY } from './constants'

const logger = getLogger(`mergeUsers`)

export async function mergeUsers({
  userToDeleteId,
  userToKeepId,
  persist,
}: {
  userToKeepId: string
  userToDeleteId: string
  persist: boolean
}) {
  const usersWithData = await prismaClient.user.findMany({
    where: { id: { in: [userToKeepId, userToDeleteId] } },
    include: {
      userCryptoAddresses: true,
      userEmailAddresses: true,
      userSessions: true,
      userActions: true,
      userMergeEvents: true,
    },
  })
  const userToKeep = usersWithData.find(x => x.id === userToKeepId)!
  const userToDelete = usersWithData.find(x => x.id === userToDeleteId)!

  const emailsToTransfer = userToDelete.userEmailAddresses.filter(userToDeleteEmail => {
    const correspondingEmail = userToKeep.userEmailAddresses.find(
      y => y.emailAddress === userToDeleteEmail.emailAddress,
    )
    if (!correspondingEmail) {
      return true
    }
    if (!correspondingEmail.isVerified && userToDeleteEmail.isVerified) {
      return true
    }
    const userToDeleteEmailSourceIndex = MERGE_EMAIL_SOURCE_PRIORITY.indexOf(
      userToDeleteEmail.source,
    )
    const correspondingEmailSourceIndex = MERGE_EMAIL_SOURCE_PRIORITY.indexOf(
      correspondingEmail.source,
    )
    return userToDeleteEmailSourceIndex < correspondingEmailSourceIndex
  })
  const emailsToDelete = [
    ...userToDelete.userEmailAddresses.filter(x =>
      emailsToTransfer.every(transferEmail => transferEmail.id !== x.id),
    ),
    ...userToKeep.userEmailAddresses.filter(x =>
      emailsToTransfer.find(transfer => transfer.emailAddress === x.emailAddress),
    ),
  ]
  const userCryptoAddressesUpdatePayloads: Prisma.UserCryptoAddressUpdateArgs[] =
    userToDelete.userCryptoAddresses.map(cryptoAddress => {
      return {
        where: { id: cryptoAddress.id },
        data: {
          userId: userToKeep.id,
        },
      }
    })
  const userSessionsUpdatePayloads = userToDelete.userSessions.map(session => {
    return {
      where: { id: session.id },
      data: {
        userId: userToKeep.id,
      },
    }
  }) satisfies Prisma.UserSessionUpdateArgs[]
  const userActionUpdatePayloads: Prisma.UserActionUpdateArgs[] = userToDelete.userActions.map(
    action => {
      if (action.userEmailAddressId) {
        const deletedEmail = emailsToDelete.find(x => x.id === action.userEmailAddressId)
        if (deletedEmail) {
          const replacementEmail = userToKeep.userEmailAddresses.find(
            x => x.emailAddress === deletedEmail.emailAddress,
          )!
          return {
            where: { id: action.id },
            data: {
              userEmailAddressId: replacementEmail.id,
              userId: userToKeep.id,
            },
          }
        }
      }
      return {
        where: { id: action.id },
        data: {
          userId: userToKeep.id,
        },
      }
    },
  )
  logger.info(`Merging user ${userToDelete.id} into user ${userToKeep.id}`)
  logger.info(`Transferring ${emailsToTransfer.length} emails`)
  logger.info(`Deleting ${emailsToDelete.length} emails`)
  logger.info(`Transferring ${userCryptoAddressesUpdatePayloads.length} crypto addresses`)
  logger.info(`Transferring ${userSessionsUpdatePayloads.length} sessions`)
  logger.info(`Transferring ${userActionUpdatePayloads.length} actions to new user`)
  logger.info(
    `${
      userActionUpdatePayloads.filter(x => x.data.userEmailAddressId).length
    } of those actions have swapped new user email addresses`,
  )
  if (!persist) {
    logger.info(`Not persisting changes`)
    return
  }
  await prismaClient.$transaction([
    ...emailsToTransfer.map(email => {
      return prismaClient.userEmailAddress.update({
        where: { id: email.id },
        data: {
          userId: userToKeep.id,
        },
      })
    }),
    ...userCryptoAddressesUpdatePayloads.map(x => {
      return prismaClient.userCryptoAddress.update(x)
    }),
    ...userSessionsUpdatePayloads.map(x => {
      return prismaClient.userSession.update(x)
    }),
    ...userActionUpdatePayloads.map(x => {
      return prismaClient.userAction.update(x)
    }),
    ...emailsToDelete.map(email => {
      return prismaClient.userEmailAddress.delete({
        where: { id: email.id },
      })
    }),
    prismaClient.userMergeAlert.deleteMany({
      where: {
        OR: [{ userBId: userToDelete.id }, { userAId: userToDelete.id }],
      },
    }),
    prismaClient.user.delete({
      where: { id: userToDelete.id },
    }),
    prismaClient.userMergeEvent.create({
      data: {
        userId: userToKeep.id,
      },
    }),
  ])
  logger.info(`merge of user ${userToDelete.id} into user ${userToKeep.id} complete`)
}
