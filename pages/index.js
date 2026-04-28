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
      clauses
