'use client'

import useSWR from 'swr'

import { PresidentialDataWithVotingResponse } from '@/data/aggregations/decisionDesk/getDtsiPresidentialWithVotingData'
import { fetchReq } from '@/utils/shared/fetchReq'
import { apiUrls } from '@/utils/shared/urls'

export function useApiDecisionDeskPresidentialData(
  fallbackData: PresidentialDataWithVotingResponse | null,
) {
  return useSWR(
    apiUrls.decisionDeskPresidentialData(),
    url =>
      fetchReq(url)
        .then(res => res.json())
        .then(data => data as PresidentialDataWithVotingResponse),
    {
      fallbackData: fallbackData ?? undefined,
      refreshInterval: 120 * 1000,
    },
  )
}

export function useDecisionDeskPresidentRace(fallbackData: PresidentialDataWithVotingResponse) {
  return useSWR(
    apiUrls.decisionDeskRaces(),
    url =>
      fetchReq(url)
        .then(res => res.json())
        .then(data => data as PresidentialDataWithVotingResponse),
    {
      fallbackData,
      refreshInterval: 120 * 1000,
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )
}
