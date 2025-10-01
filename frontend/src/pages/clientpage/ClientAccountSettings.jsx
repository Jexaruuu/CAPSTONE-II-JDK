import React, { useState } from "react";
import ClientSettingsSidebar from "../../clientcomponents/clientaccountsettingscomponents/ClientSettingsSidebar";
import ClientProfile from "../../clientcomponents/clientaccountsettingscomponents/ClientProfile";
import ClientSecurity from "../../clientcomponents/clientaccountsettingscomponents/ClientSecurity";
import ClientNavigation from "../../clientcomponents/ClientNavigation";
import ClientFooter from "../../clientcomponents/ClientFooter";

export default function ClientAccountSettings() {
  const [active, setActive] = useState("profile");
  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <ClientNavigation />
      <main className="max-w-[1525px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px,1fr]">
          <ClientSettingsSidebar active={active} onChange={setActive} />
          <div className="space-y-6">
            {active === "profile" && <ClientProfile />}
            {active === "security" && <ClientSecurity />}
          </div>
        </div>
      </main>
      <ClientFooter />
    </div>
  );
}
