import { Shell } from '../components/Shell'
import { CreateSurveyFlow } from '../flows/CreateSurveyFlow'

export function CreatePage() {
  return (
    <Shell
      title="Create survey"
      lede="Vertical steps on the left; each stage opens in the panel on the right — same language as the community board."
    >
      <CreateSurveyFlow />
    </Shell>
  )
}
