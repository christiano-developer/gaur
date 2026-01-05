// This directive is essential. It tells Next.js that this is a Client Component,
// allowing it to use hooks like useState and handle browser events.
"use client";

import React, { useState } from "react";
import {
  Shield,
  AlertTriangle,
  Users,
  FileCheck,
  Download,
  Trash2,
  Plus,
  Eye,
  TrendingUp,
  Award,
} from "lucide-react";

// --- TypeScript Type Definitions for better code safety ---
type Report = {
  id: number;
  reportDate: string;
  channelName: string;
  channelUrl: string;
  fraudType: string;
  description: string;
  memberCount: string;
  activityLevel: string;
  priceRange: string;
  location: string;
  dateDiscovered: string;
  screenshots: string;
  reporterContact: string;
};

type CurrentReportState = Omit<Report, "id" | "reportDate">;

type StatsState = {
  totalReports: number;
  thisWeek: number;
  contributions: number;
  communityMembers: number;
  channelsShutdown: number;
  arrestsMade: number;
};

// --- Main Page Component ---
export default function GoaCyberWatchPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [currentReport, setCurrentReport] = useState<CurrentReportState>({
    channelName: "",
    channelUrl: "",
    fraudType: "mule_accounts",
    description: "",
    memberCount: "",
    activityLevel: "high",
    priceRange: "",
    location: "",
    dateDiscovered: new Date().toISOString().split("T")[0],
    screenshots: "",
    reporterContact: "",
  });

  const [stats, setStats] = useState<StatsState>({
    totalReports: 247,
    thisWeek: 18,
    contributions: 0,
    communityMembers: 1453,
    channelsShutdown: 227,
    arrestsMade: 67,
  });

  const fraudTypes = [
    {
      value: "mule_accounts",
      label: "Bank Mule Accounts",
      icon: "💳",
      severity: "Critical",
    },
    {
      value: "sim_cards",
      label: "SIM Card Trading",
      icon: "📱",
      severity: "High",
    },
    {
      value: "fraud_groups",
      label: "Fraud Coordination",
      icon: "👥",
      severity: "Critical",
    },
    {
      value: "phishing",
      label: "Phishing Operations",
      icon: "🎣",
      severity: "High",
    },
    {
      value: "fake_docs",
      label: "Fake Documents",
      icon: "📄",
      severity: "High",
    },
    {
      value: "investment_scams",
      label: "Investment Scams",
      icon: "💰",
      severity: "Medium",
    },
    {
      value: "other",
      label: "Other Cyber Crime",
      icon: "⚠️",
      severity: "Medium",
    },
  ];

  const activityLevels = [
    { value: "high", label: "High Activity", desc: "Multiple posts daily" },
    { value: "medium", label: "Medium Activity", desc: "Weekly posts" },
    { value: "low", label: "Low Activity", desc: "Occasional posts" },
  ];

  const addReport = () => {
    if (!currentReport.channelName || !currentReport.channelUrl) {
      alert("Please provide at least channel name and URL");
      return;
    }

    const newReport: Report = {
      ...currentReport,
      id: Date.now(),
      reportDate: new Date().toISOString(),
    };
    setReports([...reports, newReport]);
    setStats({
      ...stats,
      totalReports: stats.totalReports + 1,
      thisWeek: stats.thisWeek + 1,
      contributions: stats.contributions + 1,
    });

    // Reset form
    setCurrentReport({
      channelName: "",
      channelUrl: "",
      fraudType: "mule_accounts",
      description: "",
      memberCount: "",
      activityLevel: "high",
      priceRange: "",
      location: "",
      dateDiscovered: new Date().toISOString().split("T")[0],
      screenshots: "",
      reporterContact: "",
    });
  };

  const deleteReport = (id: number) => {
    setReports(reports.filter((r) => r.id !== id));
  };

  const exportForPolice = () => {
    const reportData = {
      metadata: {
        program: "Goa Police Citizen Cyber Watch",
        reportGeneratedDate: new Date().toISOString(),
        totalChannelsReported: reports.length,
        reportingPeriod: "Ongoing Citizen Science Initiative",
        submittedTo: "Goa Police Cyber Crime Cell",
      },
      citizenContributions: reports.map((r) => ({
        reportId: r.id,
        reportDate: r.reportDate,
        channelInformation: {
          channelName: r.channelName,
          channelUrl: r.channelUrl,
          memberCount: r.memberCount,
          activityLevel: r.activityLevel,
        },
        fraudClassification: {
          type: fraudTypes.find((f) => f.value === r.fraudType)?.label,
          severity: fraudTypes.find((f) => f.value === r.fraudType)?.severity,
        },
        intelligence: {
          description: r.description,
          priceRange: r.priceRange,
          locationIndicators: r.location,
          dateDiscovered: r.dateDiscovered,
        },
        evidence: {
          screenshots: r.screenshots,
        },
        reporterContact: r.reporterContact || "Anonymous",
      })),
      recommendedAction:
        "Please review for investigation and potential coordination with Telegram and banking authorities",
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `goa-police-cyber-watch-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportBulkReport = () => {
    let text =
      "╔════════════════════════════════════════════════════════════╗\n";
    text += "║       GOA POLICE CITIZEN CYBER WATCH INITIATIVE        ║\n";
    text += "║           Cyber Crime Cell - Goa Police                ║\n";
    text +=
      "╚════════════════════════════════════════════════════════════╝\n\n";

    text += `Report Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}\n`;
    text += `Total Channels Documented: ${reports.length}\n`;
    text += `Citizen Science Contributions: ${stats.contributions}\n\n`;

    text +=
      "═══════════════════════════════════════════════════════════════\n\n";

    reports.forEach((r, i) => {
      const fraudInfo = fraudTypes.find((f) => f.value === r.fraudType);
      text += `┌─ CHANNEL REPORT #${i + 1} ────────────────────────────────\n`;
      text += `│\n`;
      text += `│ Channel Name: ${r.channelName}\n`;
      text += `│ Channel URL: ${r.channelUrl}\n`;
      text += `│ \n`;
      text += `│ CLASSIFICATION:\n`;
      text += `│ └─ Type: ${fraudInfo?.label} ${fraudInfo?.icon}\n`;
      text += `│ └─ Severity: ${fraudInfo?.severity}\n`;
      text += `│ \n`;
      text += `│ INTELLIGENCE DATA:\n`;
      text += `│ └─ Date Discovered: ${r.dateDiscovered}\n`;
      if (r.memberCount) text += `│ └─ Approximate Members: ${r.memberCount}\n`;
      text += `│ └─ Activity Level: ${activityLevels.find((a) => a.value === r.activityLevel)?.label}\n`;
      if (r.priceRange) text += `│ └─ Price Range Observed: ${r.priceRange}\n`;
      if (r.location) text += `│ └─ Location Indicators: ${r.location}\n`;
      text += `│ \n`;
      if (r.description) {
        text += `│ DETAILED DESCRIPTION:\n`;
        text += `│ ${r.description.replace(/\n/g, "\n│ ")}\n`;
        text += `│ \n`;
      }
      if (r.screenshots) {
        text += `│ EVIDENCE DOCUMENTATION:\n`;
        text += `│ └─ ${r.screenshots}\n`;
        text += `│ \n`;
      }
      if (r.reporterContact) {
        text += `│ Reporter Contact: ${r.reporterContact}\n`;
      } else {
        text += `│ Reporter: Anonymous Citizen\n`;
      }
      text += `│\n`;
      text += `└────────────────────────────────────────────────────────\n\n`;
    });

    text += "═══════════════════════════════════════════════════════════════\n";
    text += "SUBMISSION INFORMATION\n";
    text +=
      "═══════════════════════════════════════════════════════════════\n\n";
    text += "Goa Police Cyber Crime Cell\n";
    text += "Email: cybercell.goapolice@goa.gov.in\n";
    text += "Phone: 0832-2420884\n";
    text += "National Cybercrime Helpline: 1930\n\n";
    text +=
      "This report is submitted as part of the Goa Police Citizen Cyber\n";
    text += "Watch initiative - empowering citizens to contribute to cyber\n";
    text += "safety through community intelligence gathering.\n\n";
    text += "═══════════════════════════════════════════════════════════════\n";

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `goa-police-cyber-watch-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Banner */}
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-800 to-blue-600 p-6 text-white">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <Shield className="w-16 h-16" />
                <div>
                  <h1 className="text-3xl font-bold">
                    Goa Police Citizen Cyber Watch By GAUR
                  </h1>
                  <p className="text-blue-100 mt-1">
                    Citizen Science Initiative - Help Us Fight Cyber Crime
                  </p>
                </div>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                <div className="text-center">
                  <Award className="w-8 h-8 mx-auto mb-1" />
                  <div className="text-2xl font-bold">
                    {stats.contributions}
                  </div>
                  <div className="text-xs">Your Contributions</div>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-6 bg-white border-b-4 border-blue-800">
            {/* Stats Cards... */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 shadow-md border-l-4 border-blue-800">
              <div className="text-center">
                <p className="text-xs text-blue-800 font-semibold mb-1">
                  Community Total
                </p>
                <p className="text-3xl font-bold text-blue-900">
                  {stats.totalReports}
                </p>
                <p className="text-xs text-blue-700">Reports Filed</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 shadow-md border-l-4 border-green-600">
              <div className="text-center">
                <p className="text-xs text-green-800 font-semibold mb-1">
                  This Week
                </p>
                <p className="text-3xl font-bold text-green-900">
                  {stats.thisWeek}
                </p>
                <p className="text-xs text-green-700">New Reports</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 shadow-md border-l-4 border-purple-600">
              <div className="text-center">
                <p className="text-xs text-purple-800 font-semibold mb-1">
                  Citizen Scientists
                </p>
                <p className="text-3xl font-bold text-purple-900">
                  {stats.communityMembers}
                </p>
                <p className="text-xs text-purple-700">Active Members</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 shadow-md border-l-4 border-red-600">
              <div className="text-center">
                <p className="text-xs text-red-800 font-semibold mb-1">
                  Action Taken
                </p>
                <p className="text-3xl font-bold text-red-900">
                  {stats.channelsShutdown}
                </p>
                <p className="text-xs text-red-700">Channels Blocked</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 shadow-md border-l-4 border-amber-600">
              <div className="text-center">
                <p className="text-xs text-amber-800 font-semibold mb-1">
                  Success Rate
                </p>
                <p className="text-3xl font-bold text-amber-900">92%</p>
                <p className="text-xs text-amber-700">Shutdown Rate</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 shadow-md border-l-4 border-indigo-600">
              <div className="text-center">
                <p className="text-xs text-indigo-800 font-semibold mb-1">
                  Arrests Made
                </p>
                <p className="text-3xl font-bold text-indigo-900">
                  {stats.arrestsMade}
                </p>
                <p className="text-xs text-indigo-700">Criminals Caught</p>
              </div>
            </div>
          </div>

          {/* Mission Statement */}
          <div className="bg-gradient-to-r from-blue-50 to-white border-l-4 border-blue-800 p-6 mx-6 my-6 rounded shadow">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-blue-800 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-blue-900 text-lg mb-2">
                  Join the Movement - Protect Goa
                </h3>
                <p className="text-blue-800 text-sm leading-relaxed">
                  As a citizen scientist, you play a vital role in keeping Goa
                  safe from cyber criminals. Your observations help law
                  enforcement identify and shut down fraud networks operating in
                  our community. <strong>Observe but never engage</strong> with
                  suspicious channels. Document what you find and let the
                  professionals handle enforcement.
                </p>
              </div>
            </div>
          </div>

          {/* Reporting Form */}
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FileCheck className="w-6 h-6 text-blue-600" />
              Document a Suspicious Channel
            </h2>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Channel Name / Username *
                </label>
                <input
                  type="text"
                  value={currentReport.channelName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCurrentReport({
                      ...currentReport,
                      channelName: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="@channelname or display name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Telegram Channel URL *
                </label>
                <input
                  type="url"
                  value={currentReport.channelUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCurrentReport({
                      ...currentReport,
                      channelUrl: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://t.me/..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fraud Classification
                </label>
                <select
                  value={currentReport.fraudType}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setCurrentReport({
                      ...currentReport,
                      fraudType: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {fraudTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label} - {type.severity} Risk
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Activity Level
                </label>
                <select
                  value={currentReport.activityLevel}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setCurrentReport({
                      ...currentReport,
                      activityLevel: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {activityLevels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label} - {level.desc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Approximate Member Count
                </label>
                <input
                  type="text"
                  value={currentReport.memberCount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCurrentReport({
                      ...currentReport,
                      memberCount: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 500+, 1000-5000"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Price Range (if applicable)
                </label>
                <input
                  type="text"
                  value={currentReport.priceRange}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCurrentReport({
                      ...currentReport,
                      priceRange: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., ₹5000-₹15000"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Location Indicators (if any)
                </label>
                <input
                  type="text"
                  value={currentReport.location}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCurrentReport({
                      ...currentReport,
                      location: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Mentions Goa, Panaji, specific areas"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date First Observed
                </label>
                <input
                  type="date"
                  value={currentReport.dateDiscovered}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCurrentReport({
                      ...currentReport,
                      dateDiscovered: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Detailed Intelligence (What are they offering? How do they
                  operate?)
                </label>
                <textarea
                  value={currentReport.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setCurrentReport({
                      ...currentReport,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24"
                  placeholder="Describe the operations, pricing, methods, language used, targeting tactics, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Evidence Documentation
                </label>
                <input
                  type="text"
                  value={currentReport.screenshots}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCurrentReport({
                      ...currentReport,
                      screenshots: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Screenshot file names or cloud storage links"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Contact (Optional - for follow-up)
                </label>
                <input
                  type="text"
                  value={currentReport.reporterContact}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCurrentReport({
                      ...currentReport,
                      reporterContact: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Email or phone (leave blank for anonymous)"
                />
              </div>
            </div>

            <button
              onClick={addReport}
              className="w-full bg-gradient-to-r from-blue-800 to-blue-600 hover:from-blue-900 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-lg transition shadow-lg flex items-center justify-center gap-2 text-lg"
            >
              <Plus className="w-6 h-6" />
              Add to Intelligence Report
            </button>
          </div>

          {/* Reports List */}
          {reports.length > 0 && (
            <div className="p-6 bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-blue-600" />
                  Your Documented Channels ({reports.length})
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={exportBulkReport}
                    className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition flex items-center gap-2 text-sm font-semibold shadow"
                  >
                    <FileCheck className="w-4 h-4" />
                    Export Report (TXT)
                  </button>
                  <button
                    onClick={exportForPolice}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2 text-sm font-semibold shadow"
                  >
                    <Download className="w-4 h-4" />
                    Export Data (JSON)
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {reports.map((report) => {
                  const fraudInfo = fraudTypes.find(
                    (f) => f.value === report.fraudType,
                  );
                  return (
                    <div
                      key={report.id}
                      className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow hover:shadow-lg transition"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">{fraudInfo?.icon}</span>
                            <h3 className="font-bold text-lg text-gray-900">
                              {report.channelName}
                            </h3>
                          </div>
                          <a
                            href={report.channelUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline block break-all"
                          >
                            {report.channelUrl}
                          </a>
                        </div>
                        <button
                          onClick={() => deleteReport(report.id)}
                          className="text-red-600 hover:text-red-800 transition"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full font-semibold text-xs ${
                              fraudInfo?.severity === "Critical"
                                ? "bg-red-100 text-red-800"
                                : fraudInfo?.severity === "High"
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {fraudInfo?.severity} Risk
                          </span>
                          <span className="text-gray-600">
                            {fraudInfo?.label}
                          </span>
                        </div>

                        {report.memberCount && (
                          <p className="text-gray-700">
                            <span className="font-semibold">Members:</span>{" "}
                            {report.memberCount}
                          </p>
                        )}
                        {report.priceRange && (
                          <p className="text-gray-700">
                            <span className="font-semibold">Prices:</span>{" "}
                            {report.priceRange}
                          </p>
                        )}
                        {report.location && (
                          <p className="text-gray-700">
                            <span className="font-semibold">Location:</span>{" "}
                            {report.location}
                          </p>
                        )}
                        {report.description && (
                          <p className="text-gray-700 text-xs mt-2 p-2 bg-gray-50 rounded">
                            <span className="font-semibold">Intel:</span>{" "}
                            {report.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contact Information */}
          <div className="bg-gradient-to-r from-blue-800 to-blue-600 p-6 text-white">
            <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6" />
              Submit Your Report to Goa Police
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/20 backdrop-blur rounded-lg p-4 border border-white/30">
                <p className="font-semibold mb-2">
                  🚔 Goa Police Cyber Crime Cell
                </p>
                <p className="text-sm text-blue-50">
                  Email: cybercell.goapolice@goa.gov.in
                </p>
                <p className="text-sm text-blue-50">Phone: 0832-2420884</p>
                <p className="text-sm text-blue-50 mt-2">
                  Address: Crime Branch, Panaji, Goa
                </p>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg p-4 border border-white/30">
                <p className="font-semibold mb-2">📞 Emergency Helplines</p>
                <p className="text-sm text-blue-50">
                  National Cybercrime: 1930
                </p>
                <p className="text-sm text-blue-50">Police Control Room: 100</p>
                <p className="text-sm text-blue-50">Women Helpline: 1091</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
