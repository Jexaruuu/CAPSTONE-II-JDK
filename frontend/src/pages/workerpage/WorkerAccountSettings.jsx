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
      {/* keep your container width; matches WorkerNavigation's 1530 nicely if you want to tweak */}
      <main className="max-w-[1525px] mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Account Settings</h1>
          <p className="text-gray-500">Manage your profile, security, and preferences.</p>
        </div>
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
