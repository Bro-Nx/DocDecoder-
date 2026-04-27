import { useState, useRef, useCallback } from "react";
import Head from "next/head";

const T = {
  bg:"#F7F4EE", paper:"#FDFBF7", ink:"#1A1814",
  dim:"#8A8070", border:"#E2DDD4", gold:"#B8860B",
  goldLt:"#F0CC7A", red:"#C0392B", amber:"#D97706",
  green:"#15803D", blue:"#1D4ED8",
  redBg:"#FEF2F2", ambBg:"#FFFBEB", grnBg:"#F0FDF4", bluBg:"#EFF6FF",
  indigoBg:"#EEF2FF", indigo:"#4338CA",
  tealBg:"#F0FDFA", teal:"#0F766E",
  violetBg:"#F5F3FF", violet:"#7C3AED",
  roseBg:"#FFF1F2", rose:"#BE185D",
};

const RISK = {
  RED:  { bg:T.redBg,  border:T.red,   text:T.red,   label:"HIGH RISK", dot:"#EF4444" },
  AMBER:{ bg:T.ambBg,  border:T.amber, text:T.amber, label:"REVIEW",    dot:"#F59E0B" },
  GREEN:{ bg:T.grnBg,  border:T.green, text:T.green, label:"STANDARD",  dot:"#22C55E" },
  BLUE: { bg:T.bluBg,  border:T.blue,  text:T.blue,  label:"INFO",      dot:"#3B82F6" },
};

const QT = {
  EXPANSION:  { label:"Expansion",    icon:"🔍", color:"#15803D", bg:"#F0FDF4", source:"Cherry, Ch.4",         what:"Opens hidden dimensions. Starts with Describe / Walk me through / Share with me. Lets you do the talking.", sequence:"AWARENESS", seqNum:1 },
  LOCKON:     { label:"Lock-On",      icon:"🔒", color:"#1D4ED8", bg:"#EFF6FF", source:"Cherry, Ch.6",         what:"Zeroes in on a specific word or phrase the document uses. Forces the client to define what it actually means to them.", sequence:"AWARENESS", seqNum:2 },
  IMPACT:     { label:"Impact",       icon:"⚡", color:"#C0392B", bg:"#FEF2F2", source:"Cherry, Ch.6",         what:"Quantifies the cost of inaction. Gets the client to calculate in dollars, time, or risk what this clause could actually cost.", sequence:"EMOTION", seqNum:3 },
  VISION:     { label:"Vision",       icon:"🔭", color:"#4338CA", bg:"#EEF2FF", source:"Cherry, Ch.7",         what:"Paints a positive future. Uses 'if' to move from pain to possibility. Uncovers what the client is really trying to protect.", sequence:"ACTION", seqNum:4 },
  CALIBRATED: { label:"Calibrated",   icon:"🎯", color:"#7C3AED", bg:"#F5F3FF", source:"Voss, Ch.7",           what:"Always starts with How or What. Never yes/no. Forces the other party to think — not react. Gives you illusion of control.", sequence:"NEGOTIATION", seqNum:5 },
  LABEL:      { label:"Label",        icon:"🪞", color:"#0F766E", bg:"#F0FDFA", source:"Voss, Ch.3",           what:"Names the underlying emotion. 'It seems like...' / 'It looks like...' Validates before asking. Lowers defenses.", sequence:"EMPATHY", seqNum:6 },
  LOSS:       { label:"Loss Aversion",icon:"⚖️", color:"#BE185D", bg:"#FFF1F2", source:"Voss, Ch.6 + Kahneman",what:"Frames around what they stand to LOSE, not gain. Per Prospect Theory, loss aversion is 2x stronger than gain motivation.", sequence:"EMOTION", seqNum:7 },
};

const SEQ_ORDER = { AWARENESS:1, EMOTION:2, ACTION:3, NEGOTIATION:4, EMPATHY:5 };
const SEQ_COLOR = { AWARENESS:"#15803D", EMOTION:"#C0392B", ACTION:"#4338CA", NEGOTIATION:"#7C3AED", EMPATHY:"#0F766E" };

const SYSTEM = `You are DocDecoder™, a document clarity engine for non-lawyers. You EXPLAIN documents — you do NOT give legal advice.

Return ONLY valid JSON with this exact shape:

{
  "documentType": "string",
  "summary": "string — 2-3 sentences, plain English",
  "overallRisk": "RED|AMBER|GREEN",
  "overallRiskReason": "string — one sentence",
  "clauses": [
    {
      "title": "string",
      "original": "string — key language from the clause, max 80 words",
      "plain": "string — what this means in plain English for the recipient",
      "risk": "RED|AMBER|GREEN|BLUE",
      "riskNote": "string — specific reason for this rating"
    }
  ],
  "actions": [
    {
      "priority": "URGENT|IMPORTANT|OPTIONAL",
      "action": "string — specific step",
      "reason": "string — why this matters"
    }
  ],
  "questions": [
    {
      "type": "EXPANSION|LOCKON|IMPACT|VISION|CALIBRATED|LABEL|LOSS",
      "question": "string — the exact question to ask or reflect on, written in full",
      "why": "string — what this question is designed to surface",
      "askedOf": "YOURSELF|THE_OTHER_PARTY|A_LAWYER",
      "urgency": "HIGH|MEDIUM|LOW",
      "sequence": "AWARENESS|EMOTION|ACTION|NEGOTIATION|EMPATHY"
    }
  ],
  "disclaimer": "This analysis explains what the document says in plain English. It is not legal advice. For decisions involving significant legal or financial risk, consult a qualified attorney.",
  "keyDates": [{ "label": "string", "value": "string" }],
  "keyParties": [{ "role": "string", "name": "string" }]
}

Generate 8-15 questions. Every question must reference THIS document's specific content.
Generate questions that move from personal reflection to negotiation leverage. Cover awareness, emotional impact, desired outcomes, and direct questions for the other party or a lawyer.
Distribution: 1-2 EXPANSION, 1-2 LOCKON, 2 IMPACT, 1-2 VISION, 1-2 CALIBRATED, 1 LABEL, 1 LOSS.
CRITICAL: The last 3-5 questions MUST have askedOf set to THE_OTHER_PARTY or A_LAWYER. Never YOURSELF for the final questions.
Never return anything outside the JSON block.`;

const PRODUCTS = [

    {
    id:"health", icon:"🏥", name:"Health DocDecoder",
    tagline:"Medical bills, EOBs & denial letters",
    color:"#0EA5E9", lt:"#E0F2FE", brd:"#7DD3FC",
    docs:"Medical Bills · EOBs · Insurance Denials · Prior Auth Letters",
    signal:"My insurance denied my claim. I have no idea what this EOB means.",
    sampleDoc:`EXPLANATION OF BENEFITS — United Health Group
Member: Jane Doe | Member ID: UHG-2291047 | Date of Service: January 8, 2026
Provider: Riverside Medical Center
Service: Emergency Dept (CPT 99285) + CT Scan Abdomen (CPT 74177)
Billed: $8,240.00 | Plan Paid: $1,648.00 | Your Responsibility: $2,472.00

DENIAL — CT Scan: DENIED — Code PR-96
"This service was not medically necessary. Peer-to-peer review may be requested within 30 days. You have the right to appeal within 180 days of this notice."

Deductible Status: $1,200 of $3,000 met.`,
    sr:{
      documentType:"Explanation of Benefits (EOB) with Denial",
      summary:"Your insurance paid $1,648 of an $8,240 hospital bill, leaving you $2,472. The CT scan was denied as not medically necessary — but you have 30 days for peer review (70% reversal rate) and 180 days to appeal in writing.",
      overallRisk:"RED", overallRiskReason:"Active denial with a 30-day peer review window that is closing.",
      clauses:[
        {title:"CT Scan Denial (PR-96)",original:"This service was not medically necessary based on information provided.",plain:"Automated determination — not a medical judgment. PR-96 denials are overturned ~70% of the time when the ordering physician provides a letter of medical necessity.",risk:"RED",riskNote:"The 30-day peer-to-peer window is your highest-success path."},
        {title:"Your Cost Responsibility",original:"Your Responsibility: $2,472.00",plain:"You owe $2,472 after insurance adjustment. This amount is not final if the denial is appealed successfully.",risk:"AMBER",riskNote:"Do not pay until after the appeal outcome."},
        {title:"Appeal Rights Window",original:"Appeal within 180 days. Peer-to-peer review within 30 days.",plain:"6 months for written appeal — but only 30 days for the faster peer-to-peer path where your doctor speaks directly with the insurance doctor.",risk:"RED",riskNote:"30-day window requires your doctor to act. Contact them today."},
        {title:"Deductible Status",original:"$1,200 of $3,000 individual deductible met.",plain:"You have met $1,200 of your $3,000 deductible. Useful for planning any upcoming procedures this year.",risk:"BLUE",riskNote:"Informational only."},
      ],
      actions:[
        {priority:"URGENT",action:"Call your doctor's billing office TODAY and request a peer-to-peer review",reason:"The 30-day window closes fast. ~70% reversal rate when your doctor speaks with the insurance doctor directly."},
        {priority:"URGENT",action:"Do NOT pay the $2,472 bill yet",reason:"Paying signals acceptance. Ask the provider to note your account is under appeal."},
        {priority:"IMPORTANT",action:"Ask your doctor to write a Letter of Medical Necessity",reason:"The backbone of any appeal — must state why the CT scan was clinically required given your specific symptoms."},
        {priority:"IMPORTANT",action:"File a formal written appeal before the 180-day deadline",reason:"Even if peer review is in progress, the written appeal preserves all your rights."},
      ],
      questions:[
        {type:"EXPANSION",question:"Walk me through exactly what symptoms led the ER doctor to order the CT scan.",why:"",askedOf:"YOURSELF",urgency:"HIGH",sequence:"AWARENESS"},
        {type:"EXPANSION",question:"Describe what happened from the moment you arrived at the ER to when the CT scan was ordered — as specifically as you can.",why:"",askedOf:"YOURSELF",urgency:"HIGH",sequence:"AWARENESS"},
        {type:"LOCKON",question:"This EOB uses the phrase 'not medically necessary' — what specific information did your doctor actually submit with the original claim?",why:"",askedOf:"YOURSELF",urgency:"HIGH",sequence:"AWARENESS"},
        {type:"IMPACT",question:"What would it cost you financially if you paid the $2,472 today without appealing, and then discovered the denial could have been overturned?",why:"",askedOf:"YOURSELF",urgency:"HIGH",sequence:"EMOTION"},
        {type:"IMPACT",question:"If this same situation repeated next year and you still hadn't appealed the process, what would the cumulative financial impact be?",why:"",askedOf:"YOURSELF",urgency:"MEDIUM",sequence:"EMOTION"},
        {type:"LOSS",question:"What is the worst realistic outcome if you miss the 30-day peer-to-peer window and are left with only the slower written appeal path?",why:"",askedOf:"YOURSELF",urgency:"HIGH",sequence:"EMOTION"},
        {type:"VISION",question:"If this denial were overturned and your balance dropped to your actual copay amount, what would that free up for you this month?",why:"",askedOf:"YOURSELF",urgency:"MEDIUM",sequence:"ACTION"},
        {type:"VISION",question:"If you successfully appeal this denial, what does that change about how you handle medical bills going forward?",why:"",askedOf:"YOURSELF",urgency:"LOW",sequence:"ACTION"},
        {type:"CALIBRATED",question:"How does your doctor's office typically handle peer-to-peer review requests, and what do they need from you to initiate one?",why:"",askedOf:"THE_OTHER_PARTY",urgency:"HIGH",sequence:"NEGOTIATION"},
        {type:"CALIBRATED",question:"What documentation would the insurance company need to reverse a PR-96 medical necessity denial?",why:"",askedOf:"THE_OTHER_PARTY",urgency:"HIGH",sequence:"NEGOTIATION"},
        {type:"CALIBRATED",question:"What is the exact deadline for requesting a peer-to-peer review, and what happens to our appeal rights if that window closes?",why:"",askedOf:"A_LAWYER",urgency:"HIGH",sequence:"NEGOTIATION"},
        {type:"CALIBRATED",question:"If the peer-to-peer review is denied, what is the strongest grounds for a formal written appeal of a PR-96 denial?",why:"",askedOf:"A_LAWYER",urgency:"HIGH",sequence:"NEGOTIATION"},
      ],
      disclaimer:"This analysis explains what the document says in plain English. It is not medical or legal advice. Consult a qualified patient advocate or attorney for guidance.",
      keyDates:[{label:"Peer Review Deadline",value:"30 days from EOB"},{label:"Appeal Deadline",value:"180 days from EOB"}],
      keyParties:[{role:"Insurer",name:"United Health Group"},{role:"Provider",name:"Riverside Medical Center"},{role:"Member",name:"Jane Doe"}],
    }
  },
  {
    id:"policy", icon:"📋", name:"Policy DocDecoder",
    tagline:"Insurance policies, riders & exclusions",
    color:"#8B5CF6", lt:"#EDE9FE", brd:"#C4B5FD",
    docs:"Home · Auto · Life · Renters Policies · Exclusion Riders",
    signal:"My house flooded and insurance denied it citing an exclusion I never knew existed.",
    sampleDoc:`HOMEOWNERS INSURANCE POLICY — HO-3
PolicyHolder: Robert Chen | Policy No: HO-449821-C | Effective: March 1, 2026
Coverage A Dwelling: $480,000 | Standard Deductible: $2,500
Windstorm Deductible Rider: 2% of Coverage A = $9,600

EXCLUSIONS
1. WATER DAMAGE: We do not cover flood, surface water, waves, tidal water, or water backing up through sewers or drains.
2. EARTH MOVEMENT: Earthquake, landslide, mudslide not covered.
3. MOLD: Not covered unless resulting from a covered water loss.
4. ORDINANCE OR LAW: Increased rebuild cost to comply with current building codes not covered unless separately purchased.
5. VACANCY: If dwelling is vacant 60+ consecutive days, vandalism coverage is suspended.`,
    sr:{
      documentType:"Homeowners Insurance Policy (HO-3)",
      summary:"Standard homeowners policy with three gaps most policyholders never know about: an absolute flood exclusion, a windstorm deductible of $9,600 (4× the standard $2,500), and no building code upgrade coverage.",
      overallRisk:"AMBER", overallRiskReason:"Three significant coverage gaps almost certainly unknown to the policyholder.",
      clauses:[
        {title:"Flood Exclusion",original:"We do not cover loss caused by flood, surface water, waves, tidal water, or water backing up through drains.",plain:"Any water from outside your home is NOT covered. The most common surprise denial after storms.",risk:"RED",riskNote:"Separate NFIP or private flood insurance required. Starts ~$700/yr."},
        {title:"Windstorm Deductible",original:"Windstorm deductible: 2% of Coverage A = $9,600 for named storms.",plain:"If a named hurricane damages your home, your deductible is $9,600 — not $2,500. Most policyholders don't know this until they file a claim.",risk:"RED",riskNote:"Applies to every named-storm claim. 4× your standard deductible."},
        {title:"Ordinance or Law Exclusion",original:"Increased rebuild cost to comply with current building codes not covered unless separately purchased.",plain:"If your home is significantly damaged and needs rebuilding, code-required upgrades are NOT covered. In older homes this can reach $50,000+.",risk:"AMBER",riskNote:"Ordinance or Law endorsement typically costs $50–150/year."},
        {title:"Vacancy Clause",original:"If the dwelling is vacant 60+ consecutive days, vandalism coverage is suspended.",plain:"Leave your home empty for 60+ days and vandalism coverage turns off — with no notification to you.",risk:"BLUE",riskNote:"Note this if you plan extended travel."},
      ],
      actions:[
        {priority:"URGENT",action:"Call your agent and ask if you are in a FEMA flood zone",reason:"HO-3 flood exclusion is absolute. NFIP policies start ~$700/yr. Zone A or AE lenders require it."},
        {priority:"IMPORTANT",action:"Ask your agent to quote an Ordinance or Law endorsement",reason:"In homes over 20 years old, this gap can cost $30,000–$80,000 in a major rebuild."},
        {priority:"IMPORTANT",action:"Document your home with photos and video stored off-site",reason:"Pre-loss documentation is your strongest negotiating tool in any claim."},
        {priority:"OPTIONAL",action:"Review your emergency fund against the $9,600 windstorm deductible",reason:"This deductible is 4× your standard — applies to every named-storm claim."},
      ],
      questions:[
        {type:"EXPANSION",question:"Walk me through how you would pay for repairs if a hurricane hit tomorrow and your deductible was $9,600 instead of $2,500.",why:"",askedOf:"YOURSELF",urgency:"HIGH",sequence:"AWARENESS"},
        {type:"EXPANSION",question:"Describe the last time you reviewed your coverage. What did you check, and what did you assume was covered without verifying?",why:"",askedOf:"YOURSELF",urgency:"MEDIUM",sequence:"AWARENESS"},
        {type:"LOCKON",question:"This policy uses 'sudden and accidental' for covered water damage — what does that mean for a slow leak you didn't notice for 3 weeks?",why:"",askedOf:"YOURSELF",urgency:"HIGH",sequence:"AWARENESS"},
        {type:"IMPACT",question:"What would it cost out-of-pocket to rebuild to current building codes if your home were 50% destroyed tonight?",why:"",askedOf:"YOURSELF",urgency:"MEDIUM",sequence:"EMOTION"},
        {type:"LOSS",question:"What is the worst realistic outcome if you experience a flood and discover your policy covers zero dollars of it?",why:"",askedOf:"YOURSELF",urgency:"HIGH",sequence:"EMOTION"},
        {type:"LOSS",question:"If a named storm triggered the $9,600 windstorm deductible instead of your $2,500 standard — do you have that gap covered in savings right now?",why:"",askedOf:"YOURSELF",urgency:"HIGH",sequence:"EMOTION"},
        {type:"VISION",question:"If you added flood coverage and the ordinance endorsement for ~$800/yr total, what would change about how you feel going into storm season?",why:"",askedOf:"YOURSELF",urgency:"MEDIUM",sequence:"ACTION"},
        {type:"CALIBRATED",question:"How would this policy respond to a claim where rain came through a damaged roof — is that treated as flood or a covered peril?",why:"",askedOf:"THE_OTHER_PARTY",urgency:"HIGH",sequence:"NEGOTIATION"},
        {type:"CALIBRATED",question:"What steps must be taken within the first 48 hours of a loss to preserve all claim rights under this policy?",why:"",askedOf:"THE_OTHER_PARTY",urgency:"HIGH",sequence:"NEGOTIATION"},
        {type:"CALIBRATED",question:"Is the mold exclusion in this policy enforceable if mold grew as a direct result of a covered peril like a burst pipe?",why:"",askedOf:"A_LAWYER",urgency:"MEDIUM",sequence:"NEGOTIATION"},
        {type:"CALIBRATED",question:"What is the process and timeline for disputing a claim denial under this policy, and what documentation is most critical?",why:"",askedOf:"A_LAWYER",urgency:"HIGH",sequence:"NEGOTIATION"},
      ],
      disclaimer:"This analysis explains what the policy says in plain English. It is not insurance or legal advice.",
      keyDates:[{label:"Policy Effective",value:"March 1, 2026"},{label:"Vacancy Trigger",value:"60 consecutive days"}],
      keyParties:[{role:"Policyholder",name:"Robert Chen"},{role:"Policy",name:"HO-449821-C"}],
    }
  },
  {
    id:"legal", icon:"⚖️", name:"Legal DocDecoder",
    tagline:"Agreements, job offers, NDAs & legal paperwork",
    color:"#B8860B", lt:"#FEF9EC", brd:"#F0CC7A",
    docs:"Employment Contracts · NDAs · Cease & Desist · Lease Agreements",
    signal:"I got a job offer with a non-compete and equity clause. I have no idea what I agreed to.",
    sampleDoc:`EMPLOYMENT OFFER LETTER — Nexus Technologies Inc.
Date: April 1, 2026 | Candidate: David Park | Position: Senior Product Manager
Base Salary: $145,000/year | Bonus: 15% target (discretionary)
Equity: 40,000 RSUs — 4-year vest, 25% cliff at 1 year

EMPLOYMENT TYPE: At-will. Either party may terminate at any time, with or without cause or notice.

INTELLECTUAL PROPERTY: All work product made during employment — and for 12 months following termination — shall be the exclusive property of Nexus Technologies, regardless of whether developed on personal time.

NON-COMPETE: For 18 months following termination, Employee shall not work for any company competing with Nexus Technologies in the product management software market within North America.

ARBITRATION: All disputes resolved through binding arbitration under AAA rules. Employee waives the right to a jury trial and to participate in any class action.`,
    sr:{
      documentType:"Employment Offer Letter with Restrictive Covenants",
      summary:"This offer contains four significant restrictions: a 12-month post-employment IP assignment, an 18-month non-compete, a non-solicitation clause, and mandatory arbitration waiving your jury trial and class action rights. The equity has a 1-year cliff — zero equity if you leave before April 2027.",
      overallRisk:"AMBER", overallRiskReason:"IP assignment and non-compete are broader than industry standard and could restrict your career for 18 months.",
      clauses:[
        {title:"Equity — 1-Year Cliff",original:"40,000 RSUs vesting over 4 years (25% cliff at 1 year)",plain:"Zero equity if you leave before April 2027. After 12 months you vest 25%. The total value depends on the company's private valuation.",risk:"AMBER",riskNote:"If laid off at month 11, you lose all equity regardless of company performance."},
        {title:"IP Assignment — 12 Months Post-Employment",original:"All work product made during employment and for 12 months following — regardless of personal time.",plain:"Any invention you create in the 12 months AFTER leaving Nexus — on weekends, using your own resources — could legally belong to Nexus if related to their business.",risk:"RED",riskNote:"In California this may be unenforceable. Other states may enforce it fully."},
        {title:"Non-Compete — 18 Months",original:"For 18 months following termination, no work for any company competing with Nexus in PM software within North America.",plain:"You cannot join a competitor or any PM software company for 18 months. Could eliminate most obvious next roles.",risk:"RED",riskNote:"Unenforceable in California and several other states. Your work location determines enforceability."},
        {title:"Arbitration & Class Action Waiver",original:"All disputes through binding arbitration. Employee waives right to jury trial and class action.",plain:"If Nexus mistreats you, you cannot sue in public court or join other employees. Arbitration outcomes overwhelmingly favor employers.",risk:"RED",riskNote:"Arbitration win rates for employees are significantly lower than jury trials."},
        {title:"At-Will Employment",original:"Either party may terminate at any time, with or without cause or notice.",plain:"You can be fired tomorrow with no reason. The non-compete and IP clauses still apply after termination.",risk:"AMBER",riskNote:"Standard in most US states. Restrictions survive termination even though employment does not."},
      ],
      actions:[
        {priority:"URGENT",action:"Identify the governing state and research non-compete enforceability before signing",reason:"If you work in California, the non-compete is likely unenforceable. In other states it may be fully binding."},
        {priority:"URGENT",action:"Ask Nexus to narrow the IP assignment to work during employment hours using company resources",reason:"Current language could claim personal side projects built after leaving."},
        {priority:"IMPORTANT",action:"Request deletion or narrowing of the arbitration clause",reason:"Some employers will modify when asked. Ask for carve-outs for discrimination and wage claims."},
        {priority:"IMPORTANT",action:"Ask HR for the current fair market value of the RSUs and the last 409A valuation",reason:"40,000 RSUs at $0.50 FMV is $20,000. At $5.00 FMV it is $200,000. You can't evaluate equity without this."},
      ],
      questions:[
        {type:"EXPANSION",question:"Describe for me the specific work you plan to do in the 12 months after you might leave Nexus — consulting, startup, competitor?",why:"",askedOf:"YOURSELF",urgency:"HIGH",sequence:"AWARENESS"},
        {type:"EXPANSION",question:"Walk me through any side projects, inventions, or independent work you currently have — and whether any of them relate even loosely to product management software.",why:"",askedOf:"YOURSELF",urgency:"HIGH",sequence:"AWARENESS"},
        {type:"LOCKON",question:"This agreement uses 'regardless of personal time' — what side projects or IP do you currently have that this clause could reach?",why:"",askedOf:"YOURSELF",urgency:"HIGH",sequence:"AWARENESS"},
        {type:"IMPACT",question:"What would it cost in lost income if the non-compete were enforced and you couldn't work in your field for 18 months?",why:"",askedOf:"YOURSELF",urgency:"HIGH",sequence:"EMOTION"},
        {type:"LOSS",question:"Worst outcome: laid off at month 11, all 40,000 RSUs gone, still bound by the 18-month non-compete — what does that look like financially and professionally?",why:"",askedOf:"YOURSELF",urgency:"HIGH",sequence:"EMOTION"},
        {type:"LOSS",question:"What happens to your arbitration rights if Nexus is acquired and the new parent company changes employment terms — are you still bound by this waiver?",why:"",askedOf:"YOURSELF",urgency:"MEDIUM",sequence:"EMOTION"},
        {type:"VISION",question:"If you negotiated the non-compete to 6 months with a carve-out for your side project, what would your career flexibility look like in 2 years?",why:"",askedOf:"YOURSELF",urgency:"MEDIUM",sequence:"ACTION"},
        {type:"VISION",question:"If the IP assignment were narrowed to company time and resources only, what projects could you freely pursue after leaving?",why:"",askedOf:"YOURSELF",urgency:"MEDIUM",sequence:"ACTION"},
        {type:"CALIBRATED",question:"How has Nexus handled the non-compete for employees in California, and what precedent exists for modifying the IP language?",why:"",askedOf:"THE_OTHER_PARTY",urgency:"HIGH",sequence:"NEGOTIATION"},
        {type:"CALIBRATED",question:"What would need to happen for Nexus to consider removing the post-termination IP language or narrowing the non-compete to 6 months?",why:"",askedOf:"THE_OTHER_PARTY",urgency:"MEDIUM",sequence:"NEGOTIATION"},
        {type:"CALIBRATED",question:"Is this non-compete clause enforceable under the laws of the state where I will actually be working, and what is your assessment of its scope?",why:"",askedOf:"A_LAWYER",urgency:"HIGH",sequence:"NEGOTIATION"},
        {type:"CALIBRATED",question:"If I develop a product on my own time after leaving that is adjacent to but not directly competing with Nexus — could the IP assignment clause be invoked?",why:"",askedOf:"A_LAWYER",urgency:"HIGH",sequence:"NEGOTIATION"},
      ],
        {type:"LABEL",question:"It seems like the hardest part is worrying that negotiating makes you look difficult before you start — what is your read on how this company responds to questions?",why:"",askedOf:"YOURSELF",urgency:"MEDIUM",sequence:"EMPATHY"},
      ],
      disclaimer:"This analysis explains what the document says in plain English. It is not legal advice. Non-compete enforceability varies by state. Consult an employment attorney before signing.",
      keyDates:[{label:"Equity Cliff",value:"April 2027 (12 months)"},{label:"Non-Compete",value:"18 months post-term"},{label:"IP Assignment",value:"12 months post-term"}],
      keyParties:[{role:"Employee",name:"David Park"},{role:"Employer",name:"Nexus Technologies Inc."}],
    }
  },
  {
    id:"aid", icon:"🎓", name:"Financial Aid DocDecoder",
    tagline:"FAFSA awards, student loan notes & IBR",
    color:"#10B981", lt:"#D1FAE5", brd:"#6EE7B7",
    docs:"FAFSA Award Letters · Promissory Notes · Loan Servicer Notices · IBR/PSLF",
    signal:"I signed my student loans 4 years ago and still have no idea what my actual terms are.",
    sampleDoc:`FINANCIAL AID AWARD LETTER — Millbrook University 2026-2027
Student: Maria Santos | Cost of Attendance: $52,400

GRANTS (Free Money — No Repayment Required)
Federal Pell Grant: $7,395
Millbrook Merit Scholarship: $8,000

LOANS (Must Be Repaid With Interest)
Federal Direct Subsidized Loan: $3,500 at 6.53% fixed
Federal Direct Unsubsidized Loan: $2,000 at 6.53% fixed — interest accrues immediately
Parent PLUS Loan (Optional): $12,605 at 9.08% fixed

WORK-STUDY: $2,500 (must be earned through qualifying employment)
Remaining Balance After Aid: $16,900`,
    sr:{
      documentType:"Financial Aid Award Letter",
      summary:"This letter bundles grants, loans, and work-study in a format that obscures actual debt. $15,395 is free money. $18,105 is debt you repay with interest. The optional Parent PLUS Loan at 9.08% is one of the most expensive federal loans available.",
      overallRisk:"AMBER", overallRiskReason:"The letter presents debt alongside free grants — a format that makes the total look more generous than it is.",
      clauses:[
        {title:"Grants vs. Loans",original:"Pell Grant: $7,395 | Merit Scholarship: $8,000 | Subsidized Loan: $3,500 | Unsubsidized Loan: $2,000",plain:"$15,395 is free money. $18,105 is debt with interest. The letter presents them together — that's the problem.",risk:"AMBER",riskNote:"Studies show most students cannot identify how much of their award is loans vs. grants."},
        {title:"Unsubsidized Loan Interest",original:"Interest on Unsubsidized loans begins accruing immediately upon disbursement.",plain:"The $2,000 unsubsidized loan starts charging interest the day it hits your account — including during school, grace periods, and deferment.",risk:"RED",riskNote:"If you don't pay interest during school, it capitalizes and you pay interest on interest."},
        {title:"Parent PLUS Loan — Optional",original:"Parent PLUS Loan (Optional): $12,605 at 9.08% fixed",plain:"Your parents must apply, pass a credit check, and take on debt at 9.08% — one of the highest federal rates. Over 10 years they'd repay ~$17,450.",risk:"RED",riskNote:"Entirely optional. Compare against private loan rates before accepting."},
        {title:"Work-Study",original:"Federal Work-Study: $2,500 (must be earned through qualifying employment)",plain:"Work-study is not money deposited into your account. You must find and work an eligible campus job to earn up to $2,500.",risk:"BLUE",riskNote:"Many students count work-study as guaranteed aid. It requires active employment."},
      ],
      actions:[
        {priority:"URGENT",action:"Separate your award: free money ($15,395) vs. debt ($18,105)",reason:"The award letter format is a known confusion driver. The real question: can you cover the gap without the PLUS loan?"},
        {priority:"URGENT",action:"Do NOT accept the Parent PLUS Loan yet — compare private loan rates first",reason:"At 9.08%, the PLUS loan is often more expensive than private loans for parents with good credit."},
        {priority:"IMPORTANT",action:"Call financial aid and ask the GPA required for the Merit Scholarship to renew",reason:"Merit scholarships almost always have GPA requirements not stated in the award letter."},
        {priority:"IMPORTANT",action:"Use the Federal Student Aid Loan Simulator to calculate total repayment cost",reason:"studentaid.gov/loan-simulator shows your total cost. Most students have never seen this number before signing."},
      ],
      questions:[
        {type:"EXPANSION",question:"Walk me through your plan for covering the $16,900 remaining balance after all aid — what are your actual sources?",why:"",askedOf:"YOURSELF",urgency:"HIGH",sequence:"AWARENESS"},
        {type:"EXPANSION",question:"Describe what your monthly budget will look like in your first year after graduation — income, loan payments, and living costs.",why:"",askedOf:"YOURSELF",urgency:"HIGH",sequence:"AWARENESS"},
        {type:"LOCKON",question:"This letter uses 'Cost of Attendance' — does that number include personal expenses and travel, or just tuition and housing?",why:"",askedOf:"YOURSELF",urgency:"MEDIUM",sequence:"AWARENESS"},
        {type:"IMPACT",question:"What would your total debt be at graduation if you take the full loan package every year for four years, including capitalized interest?",why:"",askedOf:"YOURSELF",urgency:"HIGH",sequence:"EMOTION"},
        {type:"LOSS",question:"What is the worst realistic outcome if you take the PLUS Loan at 9.08% and your parents lose income before it's repaid?",why:"",askedOf:"YOURSELF",urgency:"HIGH",sequence:"EMOTION"},
        {type:"LOSS",question:"What happens to your ability to qualify for income-driven repayment if you take both the subsidized and unsubsidized loans at the maximum amount each year?",why:"",askedOf:"YOURSELF",urgency:"MEDIUM",sequence:"EMOTION"},
        {type:"VISION",question:"If you graduated with $22,000 in total debt instead of $40,000, what would that change about your first five years after college?",why:"",askedOf:"YOURSELF",urgency:"MEDIUM",sequence:"ACTION"},
        {type:"VISION",question:"If you could replace the PLUS loan entirely with work income or a private loan at a lower rate, what would you need to earn or qualify for?",why:"",askedOf:"YOURSELF",urgency:"MEDIUM",sequence:"ACTION"},
        {type:"CALIBRATED",question:"What GPA and credit-hour requirement must be maintained for the Merit Scholarship to renew each year?",why:"",askedOf:"THE_OTHER_PARTY",urgency:"HIGH",sequence:"NEGOTIATION"},
        {type:"CALIBRATED",question:"What happens to my financial aid package if my family's income changes significantly before next year's application?",why:"",askedOf:"THE_OTHER_PARTY",urgency:"MEDIUM",sequence:"NEGOTIATION"},
        {type:"CALIBRATED",question:"What are the income thresholds and loan balance limits that determine eligibility for Public Service Loan Forgiveness on these specific loans?",why:"",askedOf:"A_LAWYER",urgency:"MEDIUM",sequence:"NEGOTIATION"},
      ],
      disclaimer:"This analysis explains what the document says in plain English. It is not financial aid or legal advice.",
      keyDates:[{label:"Award Year",value:"2026-2027"},{label:"PLUS Loan",value:"Requires separate application"}],
      keyParties:[{role:"Student",name:"Maria Santos"},{role:"Institution",name:"Millbrook University"}],
    }
  },
];

function parseResponse(text) {
  try { const m = text.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch {}
  return null;
}

async function analyzeDocument(text) {
  const r = await fetch("/api/analyze", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ document: text }),
  });
  if (!r.ok) {
    const e = await r.json().catch(()=>({error:"Analysis failed"}));
    throw new Error(e.error || `Error ${r.status}`);
  }
  const parsed = await r.json();
  if (!parsed || !parsed.documentType) throw new Error("Could not parse response");
  return parsed;
}

function QCard({ q, isOpen, onToggle }) {
  const qt = QT[q.type] || QT.CALIBRATED;
  const urgencyC = { HIGH:T.red, MEDIUM:T.amber, LOW:T.green }[q.urgency]||T.dim;
  const askedLabels = { YOURSELF:"", THE_OTHER_PARTY:"Ask the other party", A_LAWYER:"Ask a lawyer" };
  return (
    <div style={{ border:`1px solid ${isOpen?qt.color:T.border}`, borderLeft:`3px solid ${qt.color}`, background:T.paper, marginBottom:6, transition:"border-color .14s" }}>
      <div onClick={onToggle} style={{ padding:"11px 14px", cursor:"pointer", display:"flex", alignItems:"flex-start", gap:10 }}>
        <div style={{ fontSize:14, flexShrink:0, marginTop:1 }}>{qt.icon}</div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:4, alignItems:"center" }}>

            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:7.5, color:T.dim, letterSpacing:"0.08em" }}>{askedLabels[q.askedOf]||"Reflect"}</span>

          </div>
          <p style={{ fontFamily:"'Lato',sans-serif", fontSize:13.5, fontWeight:600, color:T.ink, lineHeight:1.5 }}>{q.question}</p>
        </div>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:T.dim, flexShrink:0, marginTop:2 }}>{isOpen?"▲":"▼"}</div>
      </div>
      {isOpen && (
        <div style={{ borderTop:`1px solid ${T.border}`, padding:"10px 14px 12px 38px" }}>
          <p style={{ fontFamily:"'Lato',sans-serif", fontSize:12, color:T.dim, lineHeight:1.65 }}>{q.why}</p>
        </div>
      )}
    </div>
  );
}

export default function DocDecoder() {
  const [stage, setStage] = useState("home");
  const [docText, setDocText] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const [clause, setClause] = useState(0);
  const [tab, setTab] = useState("clauses");
  const [openQ, setOpenQ] = useState(null);
  const [qFilter, setQFilter] = useState("ALL");
  const [activeProduct, setActiveProduct] = useState(null);
  const [modal, setModal] = useState(null);
  const [modalTab, setModalTab] = useState("clauses");
  const [modalClause, setModalClause] = useState(0);
  const fileRef = useRef();

  const reset = () => { setStage("home"); setResult(null); setDocText(""); setClause(0); setTab("clauses"); setOpenQ(null); setQFilter("ALL"); setActiveProduct(null); };

  const run = useCallback(async (text) => {
    if (!text?.trim() || text.trim().length < 50) { setError("Paste a document with at least 50 characters."); setStage("error"); return; }
    setStage("loading"); setError("");
    try { const d = await analyzeDocument(text); setResult(d); setClause(0); setStage("result"); }
    catch(e) { setError(e.message||"Analysis failed."); setStage("error"); }
  }, []);

  const onFile = useCallback((f) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = e => { const t = e.target.result; setDocText(t); run(t); };
    r.readAsText(f);
  }, [run]);

  const onDrop = useCallback((e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]); }, [onFile]);

  const allQ = result?.questions || [];
  const filterOpts = [
    { k:"ALL", l:"All Questions" },
    { k:"THE_OTHER_PARTY", l:"Ask Other Party" },
    { k:"A_LAWYER", l:"Ask a Lawyer" },
    ...Object.entries(QT).map(([k,v])=>({ k, l:`${v.icon} ${v.label}` })),
  ];
  const filteredQ = allQ.filter(q => q.askedOf !== "YOURSELF").filter(q => qFilter==="ALL" || q.type===qFilter || q.askedOf===qFilter).sort((a,b) => (SEQ_ORDER[a.sequence]||9) - (SEQ_ORDER[b.sequence]||9));
  const aCounts = { THE_OTHER_PARTY:0, A_LAWYER:0 };
  allQ.forEach(q => { if (aCounts[q.askedOf] !== undefined) aCounts[q.askedOf]++; });

  return (
    <>
      <Head>
        <title>DocDecoder™ — Understand any document before it costs you money</title>
        <meta name="description" content="Plain English document analysis. Clause-by-clause risk scores. Expert questions. Medical bills, insurance policies, job offers, financial aid." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=DM+Mono:wght@300;400;500&family=Lato:wght@300;400;700;900&display=swap" rel="stylesheet" />
      </Head>
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:"'Georgia',serif" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:${T.border};border-radius:2px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
        .up{animation:up .35s ease both}
        .b{cursor:pointer;border:none;transition:all .16s}.b:hover{opacity:.82;transform:translateY(-1px)}
        .g{cursor:pointer;border:none;background:transparent;transition:opacity .14s}.g:hover{opacity:.6}
        .t{cursor:pointer;border:none;background:transparent;transition:all .13s}.t:hover{opacity:.72}
        .sq{cursor:pointer;transition:all .16s}.sq:hover{border-color:${T.gold}!important;transform:translateY(-2px)}
        textarea{outline:none;resize:none}textarea:focus{border-color:${T.gold}!important}
      `}</style>

      {/* HEADER */}
      <header style={{ background:T.ink, borderBottom:`3px solid ${T.gold}`, padding:"0 28px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", height:52, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"baseline", gap:10 }}>
            <span style={{ fontFamily:"'Libre Baskerville',serif", fontSize:20, color:"#F7F4EE" }}>DocDecoder™</span>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:"#5A5040", letterSpacing:"0.22em" }}>DOCUMENT CLARITY ENGINE</span>
          </div>
          <div style={{ display:"flex", gap:16, alignItems:"center" }}>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:"#5A5040" }}>NOT LEGAL ADVICE</span>
            {stage==="result" && (
              <button className="g" onClick={reset} style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:T.goldLt, letterSpacing:"0.1em" }}>← NEW DOCUMENT</button>
            )}
          </div>
        </div>
      </header>

      {/* SAMPLE REPORT MODAL */}
      {modal && (()=>{
        const p = PRODUCTS.find(x=>x.id===modal); if (!p) return null;
        const sr = p.sr;
        const mc = sr.clauses?.[modalClause];
        const mr = mc ? (RISK[mc.risk]||RISK.BLUE) : RISK.BLUE;
        const mq = (sr.questions||[]).filter(q=>q.askedOf!=="YOURSELF").slice().sort((a,b)=>(SEQ_ORDER[a.sequence]||9)-(SEQ_ORDER[b.sequence]||9));
        return (
          <div onClick={()=>setModal(null)} style={{position:"fixed",inset:0,background:"rgba(26,24,20,0.88)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
            <div onClick={e=>e.stopPropagation()} style={{background:T.bg,border:`2px solid ${p.brd}`,maxWidth:880,width:"100%",maxHeight:"90vh",overflowY:"auto",display:"flex",flexDirection:"column"}}>
              <div style={{background:T.ink,padding:"13px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`3px solid ${p.color}`,position:"sticky",top:0,zIndex:10}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:22}}>{p.icon}</span>
                  <div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:p.color,letterSpacing:"0.18em"}}>SAMPLE REPORT — {p.name.toUpperCase()}</div>
                    <div style={{fontFamily:"'Libre Baskerville',serif",fontSize:14,color:T.goldLt}}>{sr.documentType}</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <button className="b" onClick={()=>{setModal(null);setDocText(p.sampleDoc);run(p.sampleDoc);}} style={{background:p.color,color:"#fff",padding:"7px 14px",fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.14em",border:"none"}}>RUN LIVE ANALYSIS →</button>
                  <button className="g" onClick={()=>setModal(null)} style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:T.dim}}>✕</button>
                </div>
              </div>
              <div style={{padding:"14px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",gap:16,flexWrap:"wrap",alignItems:"flex-start"}}>
                <div style={{flex:1,minWidth:200}}><p style={{fontFamily:"'Lato',sans-serif",fontSize:12.5,color:T.ink,lineHeight:1.7}}>{sr.summary}</p></div>
                {(()=>{ const r=RISK[sr.overallRisk]||RISK.AMBER; return (<div style={{background:r.bg,border:`1px solid ${r.border}`,padding:"8px 14px",textAlign:"center",flexShrink:0}}><div style={{fontFamily:"'DM Mono',monospace",fontSize:7,color:r.text,letterSpacing:"0.18em"}}>OVERALL RISK</div><div style={{fontFamily:"'Libre Baskerville',serif",fontSize:18,color:r.text,fontWeight:700}}>{sr.overallRisk}</div><div style={{fontFamily:"'DM Mono',monospace",fontSize:7.5,color:r.text,maxWidth:140,marginTop:2}}>{sr.overallRiskReason}</div></div>);})()}
              </div>
              {((sr.keyParties?.length||0)+(sr.keyDates?.length||0))>0 && (
                <div style={{padding:"8px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",gap:5,flexWrap:"wrap"}}>
                  {sr.keyParties?.map((p2,i)=>(<div key={i} style={{background:T.paper,border:`1px solid ${T.border}`,padding:"4px 9px",display:"flex",gap:5}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:7.5,color:T.dim}}>{p2.role.toUpperCase()}</span><span style={{fontFamily:"'Lato',sans-serif",fontSize:11,fontWeight:700,color:T.ink}}>{p2.name}</span></div>))}
                  {sr.keyDates?.map((d2,i)=>(<div key={i} style={{background:T.ambBg,border:`1px solid ${T.amber}`,padding:"4px 9px",display:"flex",gap:5}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:7.5,color:T.amber}}>{d2.label.toUpperCase()}</span><span style={{fontFamily:"'Lato',sans-serif",fontSize:11,fontWeight:700,color:T.ink}}>{d2.value}</span></div>))}
                </div>
              )}
              <div style={{display:"flex",borderBottom:`2px solid ${T.border}`,padding:"0 20px"}}>
                {[["clauses",`📋 Clauses (${sr.clauses?.length||0})`],["actions",`✅ Actions (${sr.actions?.length||0})`],["questions",`🎯 Questions (${mq.length})`]].map(([id,lbl])=>(
                  <button key={id} className="t" onClick={()=>{setModalTab(id);setModalClause(0);}} style={{padding:"8px 14px",borderBottom:`3px solid ${modalTab===id?p.color:"transparent"}`,color:modalTab===id?T.ink:T.dim,fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.1em",marginBottom:-2}}>{lbl}</button>
                ))}
              </div>
              <div style={{padding:"16px 20px",flex:1}}>
                {modalTab==="clauses" && (
                  <div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:12}}>
                      {sr.clauses?.map((cl,i)=>{ const r=RISK[cl.risk]||RISK.BLUE; return (<button key={i} className="t" onClick={()=>setModalClause(i)} style={{padding:"3px 8px",background:modalClause===i?T.ink:T.paper,border:`1px solid ${modalClause===i?T.ink:T.border}`,fontFamily:"'DM Mono',monospace",fontSize:7.5,color:modalClause===i?T.goldLt:T.dim,display:"flex",alignItems:"center",gap:3}}><div style={{width:5,height:5,borderRadius:"50%",background:r.dot}}/>{cl.title}</button>);})}
                    </div>
                    {mc && (<div style={{background:T.paper,border:`1px solid ${T.border}`,borderTop:`3px solid ${mr.dot}`,padding:"14px 16px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}><div style={{fontFamily:"'Libre Baskerville',serif",fontSize:15,color:T.ink}}>{mc.title}</div><div style={{background:mr.bg,border:`1px solid ${mr.border}`,padding:"3px 8px"}}><div style={{fontFamily:"'DM Mono',monospace",fontSize:7.5,color:mr.text}}>{mr.label}</div></div></div><div style={{background:T.bg,border:`1px solid ${T.border}`,borderLeft:`3px solid ${T.border}`,padding:"9px 12px",marginBottom:10}}><p style={{fontFamily:"'Lato',sans-serif",fontSize:11,color:T.dim,fontStyle:"italic",lineHeight:1.65}}>&ldquo;{mc.original}&rdquo;</p></div><div style={{fontFamily:"'DM Mono',monospace",fontSize:7.5,color:T.gold,marginBottom:4}}>WHAT THIS MEANS FOR YOU</div><p style={{fontFamily:"'Lato',sans-serif",fontSize:13,color:T.ink,lineHeight:1.75,marginBottom:10}}>{mc.plain}</p><div style={{background:mr.bg,border:`1px solid ${mr.border}`,padding:"8px 10px",display:"flex",gap:7}}><div style={{width:5,height:5,borderRadius:"50%",background:mr.dot,flexShrink:0,marginTop:3}}/><p style={{fontFamily:"'Lato',sans-serif",fontSize:11,color:T.ink,lineHeight:1.6}}>{mc.riskNote}</p></div></div>)}
                  </div>
                )}
                {modalTab==="actions" && (sr.actions||[]).map((a,i)=>{ const pc={URGENT:{bg:T.redBg,dot:"#EF4444",text:T.red},IMPORTANT:{bg:T.ambBg,dot:"#F59E0B",text:T.amber},OPTIONAL:{bg:T.grnBg,dot:"#22C55E",text:T.green}}[a.priority]||{bg:T.ambBg,dot:"#F59E0B",text:T.amber}; return (<div key={i} style={{padding:"11px 14px",marginBottom:6,background:T.paper,border:`1px solid ${T.border}`,borderLeft:`3px solid ${pc.dot}`}}><div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}><div style={{width:5,height:5,borderRadius:"50%",background:pc.dot}}/><span style={{fontFamily:"'DM Mono',monospace",fontSize:7.5,color:pc.text,letterSpacing:"0.1em"}}>{a.priority}</span></div><p style={{fontFamily:"'Lato',sans-serif",fontSize:12.5,fontWeight:700,color:T.ink,marginBottom:3,lineHeight:1.4}}>{a.action}</p><p style={{fontFamily:"'Lato',sans-serif",fontSize:11,color:T.dim,lineHeight:1.55}}>{a.reason}</p></div>);})}
                {modalTab==="questions" && (
                  <div style={{display:"flex",flexDirection:"column",gap:5}}>
                    {mq.map((q,i)=>{ const qt=QT[q.type]||QT.CALIBRATED; const uc={HIGH:T.red,MEDIUM:T.amber,LOW:T.green}[q.urgency]||T.dim; const al={YOURSELF:"",THE_OTHER_PARTY:"Ask other party",A_LAWYER:"Ask a lawyer"}; return (<div key={i} style={{border:`1px solid ${T.border}`,borderLeft:`3px solid ${qt.color}`,background:T.paper,padding:"10px 13px"}}><div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:4,alignItems:"center"}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:7,color:T.dim}}>{al[q.askedOf]||""}</span></div><p style={{fontFamily:"'Lato',sans-serif",fontSize:12.5,fontWeight:600,color:T.ink,lineHeight:1.5,marginBottom:4}}>{q.question}</p></div>);})}

                  </div>
                )}
              </div>
              <div style={{padding:"12px 20px",borderTop:`1px solid ${T.border}`,background:T.paper,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",bottom:0}}>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:T.dim}}>SAMPLE REPORT · NOT LEGAL ADVICE</div>
                <button className="b" onClick={()=>{setModal(null);setDocText(p.sampleDoc);run(p.sampleDoc);}} style={{background:p.color,color:"#fff",padding:"8px 18px",fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.14em",border:"none"}}>ANALYZE THIS DOCUMENT LIVE →</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* HOME */}
      {stage==="home" && (
        <div style={{maxWidth:1060,margin:"0 auto",padding:"40px 24px"}}>
          <div className="up" style={{textAlign:"center",marginBottom:32}}>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:T.gold,letterSpacing:"0.3em",marginBottom:12}}>◈ AI-POWERED DOCUMENT ANALYSIS</div>
            <h1 style={{fontFamily:"'Libre Baskerville',serif",fontSize:"clamp(26px,4.5vw,48px)",color:T.ink,lineHeight:1.1,marginBottom:12}}>
              Understand any document<br/><em style={{color:T.gold}}>in 60 seconds.</em>
            </h1>
            <p style={{fontFamily:"'Libre Baskerville',serif",fontSize:"clamp(16px,2.5vw,22px)",color:T.gold,fontStyle:"italic",marginBottom:8,maxWidth:540,margin:"0 auto 8px"}}>
              &ldquo;DocDecoder: Understand any document before it costs you money. 💰&rdquo;
            </p>
            <p style={{fontFamily:"'Lato',sans-serif",fontSize:14,color:T.dim,lineHeight:1.7,maxWidth:480,margin:"0 auto"}}>
              Plain English. Clause-by-clause risk scores. And 8–15 expert questions built on expert negotiation and sales frameworks.
            </p>
          </div>

          <div className="up" style={{animationDelay:"0.08s",marginBottom:28}}>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:T.dim,letterSpacing:"0.22em",marginBottom:14,textAlign:"center"}}>CHOOSE YOUR DOCUMENT TYPE</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {PRODUCTS.map(p=>(
                <div key={p.id} onClick={()=>setActiveProduct(activeProduct===p.id?null:p.id)}
                  style={{background:activeProduct===p.id?p.lt:T.paper,border:`2px solid ${activeProduct===p.id?p.color:T.border}`,borderTop:`4px solid ${p.color}`,padding:"18px 14px 14px",cursor:"pointer",transition:"all .18s",transform:activeProduct===p.id?"translateY(-3px)":"none",boxShadow:activeProduct===p.id?`0 6px 20px ${p.color}22`:"none"}}>
                  <div style={{fontSize:30,marginBottom:10,lineHeight:1}}>{p.icon}</div>
                  <div style={{fontFamily:"'Libre Baskerville',serif",fontSize:14,fontWeight:700,color:T.ink,marginBottom:4,lineHeight:1.25}}>{p.name}</div>
                  <div style={{fontFamily:"'Lato',sans-serif",fontSize:11,color:T.dim,lineHeight:1.5,marginBottom:10}}>{p.tagline}</div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:7.5,color:p.color,lineHeight:1.7,marginBottom:12}}>{p.docs}</div>
                  <div style={{background:p.lt,border:`1px solid ${p.brd}`,padding:"7px 9px",marginBottom:12}}>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:7,color:p.color,letterSpacing:"0.1em",marginBottom:2}}>REDDIT MEMBER</div>
                    <p style={{fontFamily:"'Lato',sans-serif",fontSize:10.5,color:T.ink,fontStyle:"italic",lineHeight:1.55}}>&ldquo;{p.signal}&rdquo;</p>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:5}}>
                    <button className="b" onClick={e=>{e.stopPropagation();setModal(p.id);setModalTab("clauses");setModalClause(0);}} style={{background:"transparent",border:`1px solid ${p.color}`,color:p.color,padding:"6px 10px",fontFamily:"'DM Mono',monospace",fontSize:8,letterSpacing:"0.12em",width:"100%"}}>VIEW SAMPLE REPORT</button>
                    <button className="b" onClick={e=>{e.stopPropagation();setDocText(p.sampleDoc);run(p.sampleDoc);}} style={{background:activeProduct===p.id?p.color:"transparent",border:`1px solid ${activeProduct===p.id?p.color:T.border}`,color:activeProduct===p.id?"#fff":T.dim,padding:"6px 10px",fontFamily:"'DM Mono',monospace",fontSize:8,letterSpacing:"0.12em",width:"100%"}}>TRY SAMPLE LIVE →</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="up" style={{animationDelay:"0.18s",marginBottom:20}}>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:T.dim,letterSpacing:"0.2em",marginBottom:10,textAlign:"center"}}>OR PASTE YOUR OWN DOCUMENT</div>
            <div onDrop={onDrop} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)}
              style={{border:`2px dashed ${drag?T.gold:T.border}`,background:drag?"#FFF9EC":T.paper,borderRadius:3,padding:"22px",transition:"all .2s",marginBottom:10}}>
              <textarea value={docText} onChange={e=>setDocText(e.target.value)}
                placeholder={activeProduct?`Paste your ${PRODUCTS.find(p=>p.id===activeProduct)?.name} document here...`:"Paste any document — medical bill, insurance policy, loan note, contract, NDA, offer letter..."}
                style={{width:"100%",height:160,border:"none",background:"transparent",fontFamily:"'Lato',sans-serif",fontSize:13,color:T.ink,lineHeight:1.7}}/>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:10,paddingTop:10,borderTop:`1px solid ${T.border}`}}>
                <button className="g" onClick={()=>fileRef.current.click()} style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:T.dim,letterSpacing:"0.1em"}}>📎 UPLOAD .TXT</button>
                <input ref={fileRef} type="file" accept=".txt,.md" style={{display:"none"}} onChange={e=>onFile(e.target.files[0])}/>
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:T.dim}}>{docText.length>0?`${docText.length} chars`:"or drag & drop"}</span>
              </div>
            </div>
            <button className="b" onClick={()=>run(docText)} disabled={!docText.trim()}
              style={{width:"100%",padding:"15px",background:docText.trim()?T.ink:T.border,color:docText.trim()?T.goldLt:T.dim,fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.2em",cursor:docText.trim()?"pointer":"default"}}>
              ANALYZE DOCUMENT →
            </button>
          </div>


        </div>
      )}

      {/* LOADING */}
      {stage==="loading" && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", padding:24 }}>
          <div style={{ width:38, height:38, border:`3px solid ${T.border}`, borderTopColor:T.gold, borderRadius:"50%", animation:"spin .8s linear infinite", marginBottom:22 }}/>
          <div style={{ fontFamily:"'Libre Baskerville',serif", fontSize:18, color:T.ink, marginBottom:6 }}>Analyzing your document...</div>
          <div style={{ display:"flex", flexDirection:"column", gap:5, marginTop:18, width:260 }}>
            {["Reading clause structure","Scoring risk levels","Writing plain-English summary","Generating strategic questions","Building your action plan"].map((s,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:4, height:4, borderRadius:"50%", background:T.gold, animation:`pulse 1.5s ease ${i*.3}s infinite` }}/>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:T.dim }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ERROR */}
      {stage==="error" && (
        <div style={{ maxWidth:440, margin:"72px auto", textAlign:"center", padding:24 }}>
          <div style={{ fontSize:36, marginBottom:14 }}>⚠️</div>
          <div style={{ fontFamily:"'Libre Baskerville',serif", fontSize:18, color:T.ink, marginBottom:6 }}>Analysis failed</div>
          <div style={{ fontFamily:"'Lato',sans-serif", fontSize:13, color:T.dim, marginBottom:22 }}>{error}</div>
          <button className="b" onClick={()=>setStage("home")} style={{ background:T.ink, color:T.goldLt, padding:"11px 24px", fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:"0.2em" }}>TRY AGAIN</button>
        </div>
      )}

      {/* RESULT */}
      {stage==="result" && result && (
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"22px 24px 60px" }} className="up">
          <div style={{ background:T.ink, padding:"16px 22px", marginBottom:18, display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:18, flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:220 }}>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:"#6B6148", letterSpacing:"0.2em", marginBottom:3 }}>DOCUMENT TYPE</div>
              <div style={{ fontFamily:"'Libre Baskerville',serif", fontSize:18, color:T.goldLt, marginBottom:6 }}>{result.documentType}</div>
              <p style={{ fontFamily:"'Lato',sans-serif", fontSize:12, color:"#C8BFA8", lineHeight:1.65 }}>{result.summary}</p>
            </div>
            {(()=>{ const r=RISK[result.overallRisk]||RISK.AMBER; return (
              <div style={{ background:r.bg, border:`1px solid ${r.border}`, padding:"8px 14px", textAlign:"center", flexShrink:0 }}>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:r.text, letterSpacing:"0.18em", marginBottom:2 }}>OVERALL RISK</div>
                <div style={{ fontFamily:"'Libre Baskerville',serif", fontSize:18, color:r.text, fontWeight:700 }}>{result.overallRisk}</div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:r.text, marginTop:2, maxWidth:160 }}>{result.overallRiskReason}</div>
              </div>
            );})()}
          </div>

          {(result.keyParties?.length>0||result.keyDates?.length>0)&&(
            <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
              {result.keyParties?.map((p,i)=>(<div key={i} style={{ background:T.paper, border:`1px solid ${T.border}`, padding:"5px 10px", display:"flex", gap:6 }}><span style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:T.dim }}>{p.role.toUpperCase()}</span><span style={{ fontFamily:"'Lato',sans-serif", fontSize:11, fontWeight:700, color:T.ink }}>{p.name}</span></div>))}
              {result.keyDates?.map((d,i)=>(<div key={i} style={{ background:T.ambBg, border:`1px solid ${T.amber}`, padding:"5px 10px", display:"flex", gap:6 }}><span style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:T.amber }}>{d.label.toUpperCase()}</span><span style={{ fontFamily:"'Lato',sans-serif", fontSize:11, fontWeight:700, color:T.ink }}>{d.value}</span></div>))}
            </div>
          )}

          <div style={{ display:"flex", borderBottom:`2px solid ${T.border}`, marginBottom:16, overflowX:"auto" }}>
            {[["clauses",`📋 Clauses (${result.clauses?.length||0})`],["actions",`✅ Action Plan (${result.actions?.length||0})`],["questions",`🎯 Questions to Ask (${allQ.length})`]].map(([id,label])=>(
              <button key={id} className="t" onClick={()=>setTab(id)} style={{ padding:"10px 18px", borderBottom:`3px solid ${tab===id?T.gold:"transparent"}`, color:tab===id?T.ink:T.dim, fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:"0.12em", whiteSpace:"nowrap", marginBottom:-2 }}>{label}</button>
            ))}
          </div>

          {tab==="clauses" && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 290px", gap:16, alignItems:"start" }}>
              <div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:T.gold, letterSpacing:"0.2em", marginBottom:10 }}>◈ CLAUSE ANALYSIS</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:14 }}>
                  {result.clauses?.map((c,i)=>{ const r=RISK[c.risk]||RISK.BLUE; return (<button key={i} className="t" onClick={()=>setClause(i)} style={{ padding:"4px 9px", background:clause===i?T.ink:T.paper, border:`1px solid ${clause===i?T.ink:T.border}`, fontFamily:"'DM Mono',monospace", fontSize:8, color:clause===i?T.goldLt:T.dim, display:"flex", alignItems:"center", gap:4 }}><div style={{ width:5, height:5, borderRadius:"50%", background:r.dot }}/>{c.title}</button>);})}
                </div>
                {result.clauses?.[clause]&&(()=>{ const c=result.clauses[clause]; const r=RISK[c.risk]||RISK.BLUE; return (
                  <div style={{ background:T.paper, border:`1px solid ${T.border}`, borderTop:`3px solid ${r.dot}` }} key={clause} className="up">
                    <div style={{ padding:"13px 16px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div><div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:T.dim, marginBottom:3 }}>CLAUSE {clause+1} OF {result.clauses.length}</div><div style={{ fontFamily:"'Libre Baskerville',serif", fontSize:16, color:T.ink }}>{c.title}</div></div>
                      <div style={{ background:r.bg, border:`1px solid ${r.border}`, padding:"4px 9px" }}><div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:r.text, letterSpacing:"0.1em" }}>{r.label}</div></div>
                    </div>
                    <div style={{ padding:"13px 16px" }}>
                      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:T.dim, letterSpacing:"0.12em", marginBottom:5 }}>ORIGINAL LANGUAGE</div>
                      <div style={{ background:T.bg, border:`1px solid ${T.border}`, padding:"10px 13px", marginBottom:13, borderLeft:`3px solid ${T.border}` }}><p style={{ fontFamily:"'Lato',sans-serif", fontSize:11.5, color:T.dim, lineHeight:1.65, fontStyle:"italic" }}>&ldquo;{c.original}&rdquo;</p></div>
                      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:T.gold, letterSpacing:"0.12em", marginBottom:4 }}>WHAT THIS MEANS FOR YOU</div>
                      <p style={{ fontFamily:"'Lato',sans-serif", fontSize:13.5, color:T.ink, lineHeight:1.75, marginBottom:12 }}>{c.plain}</p>
                      <div style={{ background:r.bg, border:`1px solid ${r.border}`, padding:"8px 11px", display:"flex", gap:8 }}>
                        <div style={{ width:5, height:5, borderRadius:"50%", background:r.dot, flexShrink:0, marginTop:3 }}/>
                        <div><div style={{ fontFamily:"'DM Mono',monospace", fontSize:7.5, color:r.text, letterSpacing:"0.1em", marginBottom:2 }}>WHY {r.label}</div><p style={{ fontFamily:"'Lato',sans-serif", fontSize:11.5, color:T.ink, lineHeight:1.6 }}>{c.riskNote}</p></div>
                      </div>
                    </div>
                    <div style={{ padding:"8px 16px", borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between" }}>
                      <button className="g" onClick={()=>setClause(Math.max(0,clause-1))} disabled={clause===0} style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:clause===0?T.border:T.dim }}>← PREV</button>
                      <button className="g" onClick={()=>setClause(Math.min((result.clauses?.length||1)-1,clause+1))} disabled={clause===(result.clauses?.length||1)-1} style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:clause===(result.clauses?.length||1)-1?T.border:T.dim }}>NEXT →</button>
                    </div>
                  </div>
                );})()}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ background:T.paper, border:`1px solid ${T.border}` }}>
                  <div style={{ padding:"8px 12px", borderBottom:`1px solid ${T.border}`, fontFamily:"'DM Mono',monospace", fontSize:8, color:T.dim }}>RISK LEGEND</div>
                  {Object.entries(RISK).map(([k,r])=>(<div key={k} style={{ padding:"6px 12px", borderBottom:`1px solid ${T.border}22`, display:"flex", gap:8, alignItems:"center" }}><div style={{ width:7, height:7, borderRadius:"50%", background:r.dot }}/><span style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:r.text }}>{r.label}</span></div>))}
                </div>
                <div style={{ background:T.bg, border:`1px solid ${T.border}`, padding:"11px 12px" }}>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:T.gold, marginBottom:4 }}>IMPORTANT</div>
                  <p style={{ fontFamily:"'Lato',sans-serif", fontSize:10.5, color:T.dim, lineHeight:1.6 }}>{result.disclaimer}</p>
                </div>
                <button className="b" onClick={()=>setTab("questions")} style={{ background:T.violetBg, border:`1px solid ${T.violet}44`, color:T.violet, padding:"11px", fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:"0.14em" }}>🎯 SEE YOUR QUESTIONS →</button>
              </div>
            </div>
          )}

          {tab==="actions" && (
            <div style={{ maxWidth:660 }}>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:T.gold, letterSpacing:"0.2em", marginBottom:12 }}>◈ YOUR ACTION PLAN</div>
              {result.actions?.map((a,i)=>{ const pc={URGENT:{bg:T.redBg,dot:"#EF4444",text:T.red},IMPORTANT:{bg:T.ambBg,dot:"#F59E0B",text:T.amber},OPTIONAL:{bg:T.grnBg,dot:"#22C55E",text:T.green}}[a.priority]||{bg:T.ambBg,dot:"#F59E0B",text:T.amber}; return (<div key={i} style={{ padding:"13px 16px", marginBottom:6, background:T.paper, border:`1px solid ${T.border}`, borderLeft:`3px solid ${pc.dot}` }}><div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}><div style={{ width:6, height:6, borderRadius:"50%", background:pc.dot }}/><span style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:pc.text, letterSpacing:"0.12em" }}>{a.priority}</span></div><p style={{ fontFamily:"'Lato',sans-serif", fontSize:13, fontWeight:700, color:T.ink, marginBottom:3, lineHeight:1.4 }}>{a.action}</p><p style={{ fontFamily:"'Lato',sans-serif", fontSize:11.5, color:T.dim, lineHeight:1.55 }}>{a.reason}</p></div>);})}
            </div>
          )}

          {tab==="questions" && (
            <div>


              <div style={{ display:"flex", gap:4, marginBottom:14, flexWrap:"wrap" }}>
                {filterOpts.map(f=>(<button key={f.k} className="t" onClick={()=>{setQFilter(f.k);setOpenQ(null);}} style={{ padding:"4px 9px", background:qFilter===f.k?T.ink:T.paper, border:`1px solid ${qFilter===f.k?T.ink:T.border}`, color:qFilter===f.k?T.goldLt:T.dim, fontFamily:"'DM Mono',monospace", fontSize:8, letterSpacing:"0.07em", whiteSpace:"nowrap" }}>{f.l}</button>))}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:20 }}>
                {filteredQ.map((q,i)=>(<QCard key={`${qFilter}-${i}`} q={q} isOpen={openQ===`${qFilter}-${i}`} onToggle={()=>setOpenQ(openQ===`${qFilter}-${i}`?null:`${qFilter}-${i}`)}/>))}
              </div>
              {filteredQ.length===0 && (<div style={{ textAlign:"center", padding:"36px", fontFamily:"'DM Mono',monospace", fontSize:10, color:T.dim }}>No questions match this filter.</div>)}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8 }}>
                {[{key:"THE_OTHER_PARTY",icon:"🤝",label:"Ask the Other Party",color:T.amber,bg:T.ambBg,desc:"Direct questions to ask the other party — open How/What format."},{key:"A_LAWYER",icon:"⚖️",label:"Ask a Lawyer",color:T.red,bg:T.redBg,desc:"High-stakes questions requiring professional legal interpretation. Do not skip these."}].map(c=>(
                  <div key={c.key} onClick={()=>{setQFilter(c.key);setOpenQ(null);}} style={{ background:c.bg, border:`1px solid ${c.color}33`, padding:"12px 14px", cursor:"pointer", transition:"all .14s" }}>
                    <div style={{ fontSize:18, marginBottom:5 }}>{c.icon}</div>
                    <div style={{ fontFamily:"'Libre Baskerville',serif", fontSize:20, color:c.color, fontWeight:700, marginBottom:2 }}>{aCounts[c.key]}</div>
                    <div style={{ fontFamily:"'Lato',sans-serif", fontSize:12, fontWeight:700, color:T.ink, marginBottom:3 }}>{c.label}</div>
                    <p style={{ fontFamily:"'Lato',sans-serif", fontSize:11, color:T.dim, lineHeight:1.5 }}>{c.desc}</p>
                  </div>
                ))}
              </div>

            </div>
          )}

          {tab!=="questions"&&(
            <div style={{ marginTop:20 }}>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:T.gold, letterSpacing:"0.18em", marginBottom:8 }}>◈ ALL CLAUSES AT A GLANCE</div>
              <div style={{ background:T.paper, border:`1px solid ${T.border}` }}>
                <div style={{ display:"grid", gridTemplateColumns:"26px 1fr 170px 90px", padding:"6px 13px", background:T.ink, gap:10 }}>
                  {["","CLAUSE","PLAIN ENGLISH","RISK"].map(h=>(<div key={h} style={{ fontFamily:"'DM Mono',monospace", fontSize:7.5, color:"#5A5040", letterSpacing:"0.14em" }}>{h}</div>))}
                </div>
                {result.clauses?.map((c,i)=>{ const r=RISK[c.risk]||RISK.BLUE; return (
                  <div key={i} onClick={()=>{setTab("clauses");setClause(i);}} style={{ display:"grid", gridTemplateColumns:"26px 1fr 170px 90px", padding:"8px 13px", borderBottom:`1px solid ${T.border}55`, gap:10, cursor:"pointer", background:clause===i&&tab==="clauses"?"#FFF9EC":i%2===0?T.paper:T.bg, alignItems:"start", transition:"background .1s" }}>
                    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:T.dim }}>{String(i+1).padStart(2,"0")}</div>
                    <div style={{ fontFamily:"'Lato',sans-serif", fontSize:11.5, fontWeight:700, color:T.ink }}>{c.title}</div>
                    <div style={{ fontFamily:"'Lato',sans-serif", fontSize:10.5, color:T.dim, lineHeight:1.5 }}>{c.plain.substring(0,80)}{c.plain.length>80?"…":""}</div>
                    <div style={{ display:"flex", gap:4, alignItems:"center" }}><div style={{ width:5, height:5, borderRadius:"50%", background:r.dot }}/><span style={{ fontFamily:"'DM Mono',monospace", fontSize:7.5, color:r.text }}>{c.risk}</span></div>
                  </div>
                );})}
              </div>
            </div>
          )}
        </div>
      )}

      <footer style={{ background:T.ink, borderTop:`1px solid #2C2920`, padding:"13px 28px", textAlign:"center" }}>
        <p style={{ fontFamily:"'DM Mono',monospace", fontSize:7.5, color:"#4A4030", letterSpacing:"0.11em" }}>
          DOCDECODER™ &middot; NOT LEGAL ADVICE &middot; DOCUMENTS NOT STORED
        </p>
      </footer>
    </div>
    </>
  );
}