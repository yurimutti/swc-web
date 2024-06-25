import 'server-only'

import { NextResponse } from 'next/server'

import { queryDTSIAllPeople } from '@/data/dtsi/queries/queryDTSIAllPeople'
import { SECONDS_DURATION } from '@/utils/shared/seconds'

export const dynamic = 'error'
export const revalidate = SECONDS_DURATION['10_MINUTES']

export async function GET() {
  const data = await queryDTSIAllPeople()
  return NextResponse.json(data)
}
