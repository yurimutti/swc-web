'use client'

import { useEffect } from 'react'

import { actionCreateUserActionViewKeyRaces } from '@/actions/actionCreateUserActionViewKeyRaces'
import { ContentSection } from '@/components/app/ContentSection'
import { DarkHeroSection } from '@/components/app/darkHeroSection'
import { PACFooter } from '@/components/app/pacFooter'
import { UserAddressVoterGuideInputSection } from '@/components/app/pageLocationKeyRaces/locationUnitedStates/userAddressVoterGuideInput'
import { KeyRaceLiveResult } from '@/components/app/pageLocationKeyRaces/locationUnitedStatesLiveResults/keyRaceLiveResult'
import { LiveStatusBadge } from '@/components/app/pageLocationKeyRaces/locationUnitedStatesLiveResults/liveStatusBadge'
import { PresidentialRaceResult } from '@/components/app/pageLocationKeyRaces/locationUnitedStatesLiveResults/presidentialRaceResult'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { NextImage } from '@/components/ui/image'
import { InternalLink } from '@/components/ui/link'
import { PageSubTitle } from '@/components/ui/pageSubTitle'
import { PageTitle } from '@/components/ui/pageTitleText'
import { QueryDTSILocationUnitedStatesInformationData } from '@/data/dtsi/queries/queryDTSILocationUnitedStatesInformation'
import { SupportedLocale } from '@/intl/locales'
import { getIntlUrls } from '@/utils/shared/urls'
import { US_STATE_CODE_TO_DISPLAY_NAME_MAP, USStateCode } from '@/utils/shared/usStateUtils'
import { cn } from '@/utils/web/cn'

import { organizePeople } from './organizePeople'

interface LocationUnitedStatesLiveResultsProps
  extends QueryDTSILocationUnitedStatesInformationData {
  locale: SupportedLocale
}

export function LocationUnitedStatesLiveResults({
  locale,
  ...queryData
}: LocationUnitedStatesLiveResultsProps) {
  const groups = organizePeople(queryData)
  const urls = getIntlUrls(locale)

  useEffect(() => {
    void actionCreateUserActionViewKeyRaces()
  }, [])

  return (
    <div className="space-y-20">
      <DarkHeroSection className="bg-black py-8 lg:px-28 lg:py-20">
        <div className="flex flex-col items-center justify-between gap-10 lg:flex-row">
          <div className="space-y-6 text-center">
            <NextImage
              alt="SWC shield"
              className="mx-auto lg:mx-0"
              height={100}
              src="/actionTypeIcons/optIn.png"
              width={100}
            />
            <PageTitle as="h1" className="text-center lg:text-left" size="md">
              Crypto election updates
            </PageTitle>
            <PageSubTitle className="text-muted-foreground lg:text-left" size="lg">
              See how crypto is influencing the election. Get live election updates.
            </PageSubTitle>

            <Button asChild className="hidden w-fit font-bold lg:flex" variant="secondary">
              <InternalLink href={urls.locationUnitedStatesPresidential()}>
                View presidential race
              </InternalLink>
            </Button>
          </div>

          <PresidentialRaceResult candidates={groups.president} />

          <Button asChild className="w-full max-w-xs font-bold lg:hidden" variant="secondary">
            <InternalLink href={urls.locationUnitedStatesPresidential()}>
              View presidential race
            </InternalLink>
          </Button>
        </div>
      </DarkHeroSection>

      <div className="space-y-20 xl:space-y-28">
        <ContentSection
          className="container"
          subtitle="Follow our tracker to see how many pro-crypto candidates get elected in the United States this year."
          title="Live election results"
          titleProps={{ size: 'xs' }}
        >
          <div className="flex justify-center">
            <LiveStatusBadge status="live" />
          </div>

          <Card.Group>
            {[
              { value: '9,999', label: 'Pro-crypto candidates elected' },
              { value: '999,999', label: 'Votes cast for pro-crypto candidates' },
              { value: '64%', label: 'of races won by pro-crypto candidates' },
            ].map(({ value, label }) => (
              <Card className="p-8" key={label}>
                <p className="text-4xl font-bold">{value}</p>
                <p className="text-muted-foreground">{label}</p>
              </Card>
            ))}
          </Card.Group>
        </ContentSection>

        <UserAddressVoterGuideInputSection locale={locale} />

        <ContentSection
          subtitle="These elections are critical to the future of crypto in America. View live updates below."
          title="Critical elections"
          titleProps={{ size: 'xs' }}
        >
          <div className="container grid grid-cols-[repeat(auto-fill,minmax(375px,1fr))] justify-items-center gap-16">
            {Object.entries(groups.keyRaces).map(([stateCode, keyRaces]) => (
              <KeyRaceLiveResult
                candidates={keyRaces?.flatMap(race =>
                  race?.map(candidates => {
                    return candidates
                  }),
                )}
                key={stateCode}
                locale={locale}
                stateCode={stateCode as USStateCode}
              />
            ))}
          </div>
        </ContentSection>

        <ContentSection
          className="container"
          subtitle="Dive deeper and discover races in other states across America."
          title="Other states"
        >
          <div className="grid grid-cols-2 gap-3 text-center md:grid-cols-3 xl:grid-cols-4">
            {Object.keys(US_STATE_CODE_TO_DISPLAY_NAME_MAP).map(_stateCode => {
              const stateCode = _stateCode as USStateCode
              return (
                <InternalLink
                  className={cn('mb-4 block flex-shrink-0 font-semibold')}
                  href={urls.locationStateSpecific(stateCode)}
                  key={stateCode}
                >
                  {US_STATE_CODE_TO_DISPLAY_NAME_MAP[stateCode]}
                </InternalLink>
              )
            })}
          </div>
        </ContentSection>

        <PACFooter className="container text-center" />
      </div>
    </div>
  )
}
