import { useWorkspace } from "@/hooks/use-workspace";
import Folder from "./folder";
import { ExpandingArrowButton } from "./local/motion/expanding-arrow-button";

export default function GetLocalLocation(){
   const {status} = useWorkspace();

  return (
    <main className="h-screen w-screen bg-sidebar text-text-primary text-nav">
      <div className="mx-auto max-w-xl">
        <Folder />
      </div>
    </main>
  )
}
