import {Link} from 'react-router-dom'
import PilotActivationCard from '@/components/PilotActivationCard'

export default function ActivatePilotPage(){
 return <main className="sc-root min-h-screen p-4"><div className="mx-auto max-w-2xl">
  <Link to="/config" className="text-sm underline">Voltar às configurações</Link>
  <PilotActivationCard/>
 </div></main>
}
