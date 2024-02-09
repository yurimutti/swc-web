'use client'
import { DTSIAvatar } from '@/components/app/dtsiAvatar'
import { DTSIFormattedLetterGrade } from '@/components/app/dtsiFormattedLetterGrade'
import {
  UseGetDTSIPeopleFromAddressResponse,
  formatGetDTSIPeopleFromAddressNotFoundReason,
} from '@/hooks/useGetDTSIPeopleFromAddress'
import { dtsiPersonFullName } from '@/utils/dtsi/dtsiPersonUtils'
import { convertDTSIStanceScoreToCryptoSupportLanguageSentence } from '@/utils/dtsi/dtsiStanceScoreUtils'

export function DtsiCongresspersonDisplay({
  congressperson,
}: {
  congressperson?: UseGetDTSIPeopleFromAddressResponse
}) {
  if (!congressperson || 'notFoundReason' in congressperson) {
    return <div>{formatGetDTSIPeopleFromAddressNotFoundReason(congressperson)}</div>
  }

  return (
    <div className="flex flex-row items-center gap-4 text-sm md:text-base">
      <div className="relative">
        <DTSIAvatar person={congressperson} size={60} />
        <div className="absolute bottom-[-8px] right-[-8px]">
          <DTSIFormattedLetterGrade person={congressperson} size={25} />
        </div>
      </div>
      <div>
        <div className="font-bold">
          Your representative is{' '}
          <span className="text-nowrap">{dtsiPersonFullName(congressperson)}</span>
        </div>
        <div className="text-fontcolor-muted">
          {convertDTSIStanceScoreToCryptoSupportLanguageSentence(congressperson)}
        </div>
      </div>
    </div>
  )
}
