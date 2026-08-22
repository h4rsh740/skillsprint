import { ResumeData } from "./types";

export function renderResumeToHtml(data: ResumeData): string {
  const isTwoColumn = data.layout?.type === "two-column";

  const renderBullet = (bullet: string) => {
    return `<li class="text-[10.5px] leading-snug rounded relative ml-3 pl-1 mb-1 list-disc text-neutral-950">${bullet}</li>`;
  };

  const renderSectionContent = (section: any) => {
    const { type, title } = section;

    if (type === "summary" && data.summary) {
      return `<p class="text-[10.5px] leading-snug rounded mb-4 text-neutral-950">${data.summary}</p>`;
    }

    if (type === "experience" && data.experience && data.experience.length > 0) {
      return `
        <div class="space-y-3 mb-4">
          ${data.experience.map(exp => `
            <div>
              <div class="flex justify-between items-baseline font-bold text-neutral-950 text-[11px]">
                <span>${exp.position}</span>
                <span class="text-[10px] font-normal text-neutral-700">${exp.startDate || ""} – ${exp.endDate || "Present"}</span>
              </div>
              <div class="flex justify-between items-baseline text-neutral-800 text-[10.5px] italic mb-1">
                <span>${exp.company}</span>
                <span>${exp.location || ""}</span>
              </div>
              <ul class="mt-1">
                ${(exp.bullets || []).map(b => renderBullet(b)).join("")}
              </ul>
            </div>
          `).join("")}
        </div>
      `;
    }

    if (type === "projects" && data.projects && data.projects.length > 0) {
      return `
        <div class="space-y-3 mb-4">
          ${data.projects.map(proj => `
            <div>
              <div class="text-neutral-950 text-[11px] font-bold">${proj.name}</div>
              ${proj.description ? `<div class="text-[10px] text-neutral-700 italic mb-1">${proj.description}</div>` : ""}
              <ul class="mt-1">
                ${(proj.bullets || []).map(b => renderBullet(b)).join("")}
              </ul>
            </div>
          `).join("")}
        </div>
      `;
    }

    if (type === "skills" && data.skills && data.skills.length > 0) {
      return `
        <div class="mb-4">
          <ul class="text-[10.5px] text-neutral-950 space-y-1">
            ${data.skills.map(skill => `<li class="list-disc ml-3 pl-1">${skill}</li>`).join("")}
          </ul>
        </div>
      `;
    }

    if (type === "education" && data.education && data.education.length > 0) {
      return `
        <div class="space-y-2 mb-4">
          ${data.education.map(edu => `
            <div class="flex justify-between items-baseline text-[10.5px]">
              <div>
                <span class="font-bold text-neutral-950">${edu.degree}</span>
                <span class="text-neutral-800">, ${edu.school}</span>
              </div>
              <span class="text-[10px] text-neutral-700 whitespace-nowrap ml-2">
                ${edu.startDate || edu.endDate ? `${edu.startDate || ""} – ${edu.endDate || ""}` : ""}
              </span>
            </div>
          `).join("")}
        </div>
      `;
    }

    if (type === "certifications" && data.certifications && data.certifications.length > 0) {
      return `
        <div class="mb-4 text-[10.5px]">
          ${data.certifications.map(item => {
            const parts = item.split(/\s*[-–]\s*/);
            if (parts.length >= 2) {
              return `
                <div class="flex justify-between py-0.5 border-b border-neutral-300 last:border-0">
                  <span class="font-medium text-neutral-950">${parts[0]}</span>
                  <span class="text-neutral-700 text-right max-w-[40%]">${parts.slice(1).join(" - ")}</span>
                </div>
              `;
            }
            return `<div class="py-0.5 text-neutral-950">${item}</div>`;
          }).join("")}
        </div>
      `;
    }

    const isGenericList = ["achievements", "extracurricular"].includes(type);
    if (isGenericList) {
      const listData = (data as any)[type] as string[];
      if (listData && listData.length > 0) {
        return `
          <ul class="mb-4">
            ${listData.map(item => `<li class="text-[10.5px] leading-snug text-neutral-950 list-disc ml-3 pl-1 mb-1">${item}</li>`).join("")}
          </ul>
        `;
      }
    }

    if (type === "areasOfInterest" && data.areasOfInterest && data.areasOfInterest.length > 0) {
      return `
        <ul class="mb-4">
          ${data.areasOfInterest.map(item => `<li class="text-[10.5px] leading-snug text-neutral-950 list-disc ml-3 pl-1 mb-0.5">${item}</li>`).join("")}
        </ul>
      `;
    }

    if (type === "custom") {
      const customSec = data.customSections?.find(c => c.title === title);
      if (customSec && customSec.content && customSec.content.length > 0) {
        return `
          <ul class="mb-4">
            ${customSec.content.map(item => `<li class="text-[10.5px] leading-snug text-neutral-950 list-disc ml-3 pl-1 mb-1">${item}</li>`).join("")}
          </ul>
        `;
      }
    }

    return "";
  };

  const renderSectionBlock = (section: any) => `
    <div class="mb-2">
      <div class="font-bold text-neutral-950 uppercase tracking-widest text-[11px] mb-1.5 pb-0.5 border-b border-neutral-900">
        ${section.title}
      </div>
      ${renderSectionContent(section)}
    </div>
  `;

  const leftSections = data.layout?.sections?.filter(s => s.column === "left" && s.title.toLowerCase() !== "contact") || [];
  const rightSections = data.layout?.sections?.filter(s => s.column === "right" && s.title.toLowerCase() !== "contact") || [];
  const mainSections = data.layout?.sections?.filter(s => s.column === "main" && s.title.toLowerCase() !== "contact") || [];

  const contactList = [
    data.personal?.phone,
    data.personal?.email,
    data.personal?.location,
    data.personal?.linkedin,
    data.personal?.github,
    data.personal?.portfolio,
    ...(data.personal?.otherLinks || [])
  ].filter(Boolean);

  const contactInlineHtml = contactList.map((info, i) => `
    <span class="inline-flex items-center">
      ${info}
      ${i < contactList.length - 1 ? `<span class="ml-2">|</span>` : ""}
    </span>
  `).join("");

  const hasContactInLeft = isTwoColumn && data.layout?.sections?.some(s => s.title.toLowerCase() === "contact");

  const layoutBody = isTwoColumn ? `
    <div class="flex flex-row gap-8">
      <div class="w-[35%] flex flex-col shrink-0">
        ${hasContactInLeft ? `
          <div class="mb-2">
            <div class="font-bold text-neutral-950 uppercase tracking-widest text-[11px] mb-1.5 pb-0.5 border-b border-neutral-900">
              Contact
            </div>
            <ul class="text-[10.5px] text-neutral-950 space-y-1 mb-4">
              ${data.personal?.phone ? `<li>${data.personal.phone}</li>` : ""}
              ${data.personal?.email ? `<li>${data.personal.email}</li>` : ""}
              ${data.personal?.location ? `<li>${data.personal.location}</li>` : ""}
              ${data.personal?.linkedin ? `<li>${data.personal.linkedin}</li>` : ""}
              ${data.personal?.github ? `<li>${data.personal.github}</li>` : ""}
            </ul>
          </div>
        ` : ""}
        ${leftSections.map(renderSectionBlock).join("")}
      </div>
      
      <div class="w-[65%] flex flex-col">
        ${rightSections.map(renderSectionBlock).join("")}
      </div>
    </div>
  ` : `
    <div class="flex flex-col">
      ${mainSections.map(renderSectionBlock).join("")}
    </div>
  `;

  return `
    <div class="bg-white w-[794px] min-h-[1123px] p-12 text-left font-serif mx-auto print:m-0 print:p-8 print:shadow-none print:w-full">
      <div class="mb-6">
        <h1 class="text-3xl font-bold uppercase tracking-wide text-neutral-950 mb-1">
          ${data.personal?.name || data.name || "Candidate Name"}
        </h1>
        ${(data.personal?.title || data.title) ? `
          <h2 class="text-sm font-semibold uppercase tracking-wider text-neutral-700 mb-3">
            ${data.personal?.title || data.title}
          </h2>
        ` : ""}
        
        ${(!isTwoColumn || !hasContactInLeft) ? `
          <div class="text-[10.5px] text-neutral-800 flex flex-wrap gap-x-2 gap-y-1">
            ${contactInlineHtml}
          </div>
        ` : ""}
      </div>

      ${layoutBody}
    </div>
  `;
}
