import { Shell } from '../components/Shell'
import { RespondFlow } from '../flows/RespondFlow'

export function RespondPage() {
  return (
    <Shell
      title="Respond to survey"
      badge="Respondent · Sepolia"
      lede="Answer on the right. Steps stay linked on the left so you always know where you are in the round."
    >
      <RespondFlow />
    </Shell>
  )
}
