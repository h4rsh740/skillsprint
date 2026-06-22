"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Bell, Shield, Sliders, Check, LogOut, ArrowRight } from "lucide-react";
import { signOutUser } from "@/actions/auth";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [visibility, setVisibility] = useState(true);
  const [modelPref, setModelPref] = useState("auto");
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const [notifications, setNotifications] = useState({
    interviews: true,
    recruiterViews: true,
    weeklyReport: false,
  });

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOutUser();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto w-full">
      <div>
        <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-[1.08] tracking-[-0.03em] text-gray-900 flex items-center gap-3">
          <Sliders className="h-8 w-8 text-[#4f46e5]" /> Settings
        </h1>
        <p className="text-gray-600 mt-2 text-[15px]">Manage your account, recruiter visibility, and model preferences.</p>
      </div>

      <div className="grid md:grid-cols-[240px_1fr] gap-8">
        {/* Sidebar tabs */}
        <div className="flex flex-col gap-1 sticky top-8 self-start">
          <TabButton id="profile" label="Profile Settings" active={activeTab === "profile"} onClick={setActiveTab} icon={<User className="h-4 w-4" />} />
          <TabButton id="notifications" label="Notifications" active={activeTab === "notifications"} onClick={setActiveTab} icon={<Bell className="h-4 w-4" />} />
          <TabButton id="recruiter" label="Recruiter Visibility" active={activeTab === "recruiter"} onClick={setActiveTab} icon={<Shield className="h-4 w-4" />} />
          <div className="border-t border-gray-200 my-2" />
          <TabButton id="signout" label="Sign Out" active={activeTab === "signout"} onClick={setActiveTab} icon={<LogOut className="h-4 w-4" />} />
        </div>

        {/* Settings Content */}
        <div className="liquid-glass rounded-3xl p-6 sm:p-8 border border-white/50 shadow-sm min-h-[400px]">
          {activeTab === "profile" && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-3">Profile Settings</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Full Name</label>
                  <input type="text" defaultValue="Alex Rivera" className="w-full bg-white/60 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent transition-all shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
                  <input type="email" defaultValue="alex.rivera@skillsprint.ai" disabled className="w-full bg-gray-100/60 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] text-gray-500 cursor-not-allowed shadow-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Target SDE Roles</label>
                <select className="w-full bg-white/60 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent transition-all shadow-sm">
                  <option>Frontend Engineer (React)</option>
                  <option>Backend Engineer (Node/Go)</option>
                  <option>Fullstack Engineer</option>
                  <option>System Architect</option>
                </select>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button className="bg-gray-900 text-white text-[13px] font-medium rounded-full px-6 py-2.5 hover:bg-gray-800 transition-colors shadow-sm">
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-3">Notification Preferences</h3>
              <div className="space-y-4">
                <ToggleItem 
                  title="Mock Interview Reminders" 
                  description="Receive updates about scheduled preparation targets and streaks."
                  checked={notifications.interviews}
                  onChange={() => setNotifications({ ...notifications, interviews: !notifications.interviews })}
                />
                <ToggleItem 
                  title="Recruiter View Alerts" 
                  description="Get notified whenever a recruiter views or searches for your Career Twin profile."
                  checked={notifications.recruiterViews}
                  onChange={() => setNotifications({ ...notifications, recruiterViews: !notifications.recruiterViews })}
                />
                <ToggleItem 
                  title="Weekly ATS & Velocity Report" 
                  description="Receive a summary of your coding velocity, ATS changes, and target gaps."
                  checked={notifications.weeklyReport}
                  onChange={() => setNotifications({ ...notifications, weeklyReport: !notifications.weeklyReport })}
                />
              </div>
            </div>
          )}

          {activeTab === "recruiter" && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-3">Recruiter Talent Radar</h3>
              <div className="space-y-6">
                <ToggleItem 
                  title="Enable Recruiter Visibility" 
                  description="Allow verified recruiters to search and view your aggregated skill statistics, ATS profile, and Career Twin prediction."
                  checked={visibility}
                  onChange={() => setVisibility(!visibility)}
                />

                <div className="bg-white/60 border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Model Priority</span>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <ModelButton label="Balanced (Auto)" active={modelPref === "auto"} onClick={() => setModelPref("auto")} />
                    <ModelButton label="Flash (Speed)" active={modelPref === "flash"} onClick={() => setModelPref("flash")} />
                    <ModelButton label="Thorough (Accuracy)" active={modelPref === "accuracy"} onClick={() => setModelPref("accuracy")} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "signout" && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-3">Sign Out</h3>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 space-y-4">
                <div>
                  <h4 className="font-medium text-red-900 text-[15px]">Sign out of SkillSprint AI</h4>
                  <p className="text-[13px] text-red-700 mt-1 leading-relaxed">You will be redirected to the landing page. Your data and progress will be saved.</p>
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="group flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-[14px] font-medium rounded-full px-6 py-3 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {signingOut ? (
                    <span>Signing out...</span>
                  ) : (
                    <>
                      <div className="h-[20px] overflow-hidden relative">
                        <div className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
                          <span className="h-[20px] flex items-center">Sign Out</span>
                          <span className="h-[20px] flex items-center">Sign Out</span>
                        </div>
                      </div>
                      <LogOut className="w-4 h-4 transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ id, label, active, onClick, icon }: { id: string; label: string; active: boolean; onClick: (id: string) => void; icon: React.ReactNode }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[14px] font-medium transition-all ${
        active 
          ? "bg-[#4f46e5]/10 text-[#4f46e5]" 
          : "text-gray-600 hover:text-gray-900 hover:bg-white/40"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ToggleItem({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-start justify-between bg-white/60 border border-gray-200 rounded-2xl p-5 shadow-sm gap-4">
      <div className="space-y-1">
        <h4 className="font-medium text-gray-900 text-[15px]">{title}</h4>
        <p className="text-xs text-gray-500 leading-normal">{description}</p>
      </div>
      <button 
        onClick={onChange} 
        className={`w-10 h-6 flex items-center rounded-full p-1 transition-all ${checked ? "bg-[#4f46e5]" : "bg-gray-300"}`}
      >
        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-all ${checked ? "translate-x-4" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

function ModelButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between px-4 py-3 rounded-xl border text-[13px] font-medium transition-all ${
        active 
          ? "border-[#4f46e5] bg-[#4f46e5]/5 text-[#4f46e5]" 
          : "border-gray-200 bg-white hover:border-gray-300 text-gray-700"
      }`}
    >
      {label}
      {active && <Check className="h-3.5 w-3.5" />}
    </button>
  );
}
