import React, { useState } from "react";
import WorkerSettingsSidebar from "../../workercomponents/workeraccountsettingscomponents/WorkerSettingsSidebar";
import WorkerProfile from "../../workercomponents/workeraccountsettingscomponents/WorkerProfile";
import WorkerSecurity from "../../workercomponents/workeraccountsettingscomponents/WorkerSecurity";
import WorkerNavigation from "../../workercomponents/WorkerNavigation";
import WorkerFooter from "../../workercomponents/WorkerFooter";

export default function WorkerAccountSettings() {
  const [active, setActive] = useState("profile");
  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <WorkerNavigation />
      <main className="max-w-[1525px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px,1fr]">
          <WorkerSettingsSidebar active={active} onChange={setActive} />
          <div className="space-y-6">
            {active === "profile" && <WorkerProfile />}
            {active === "security" && <WorkerSecurity />}
          </div>
        </div>
      </main>
      <WorkerFooter />
    </div>
  );
}
