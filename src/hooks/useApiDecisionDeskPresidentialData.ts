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

export function useDecisionDeskPresidentRace(
  fallbackData: GetRacesResponse,
  params?: GetRacesParams,
) {
  return useSWR(
    apiUrls.decisionDeskRaces(params),
    url =>
      fetchReq(url)
        .then(res => res.json())
        .then(data => data as GetRacesResponse),
    { fallbackData, refreshInterval: 60 * 1000 * 2 },
  )
}
