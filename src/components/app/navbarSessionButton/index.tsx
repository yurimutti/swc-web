import { navbarSessionButtonMessages } from '@/components/app/navbarSessionButton/navbarSessionButtonClient.messages'
import { NavbarSessionButtonClient } from './navbarSessionButtonClient'
import { GetDefineMessageResults } from '@/types'

// TODO enable this once partial rehydration is fully supported in next.js
// export async function NavbarSessionButton() {
//   const session = await getServerSession(nextAuthConfig)
//   return <NavbarSessionButtonClient session={session} />
// }

export function NavbarSessionButton(props: {
  messages: GetDefineMessageResults<typeof navbarSessionButtonMessages>
}) {
  return <NavbarSessionButtonClient {...props} />
}
