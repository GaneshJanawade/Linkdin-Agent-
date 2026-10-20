import { useState, useRef, useEffect } from "react";

// ─── MODES ───────────────────────────────────────────────────────────────────
const MODES = {
  write: {
    label: "Write & Post", icon: "✍️",
    subFeatures: ["Post Writer", "Post Rewriter", "A/B Variants", "Hashtag Recommender", "Multi-language", "Content Calendar"],
    system: `You are a LinkedIn content specialist for Ganesh Janawade, a software engineer at Persistent Systems. Help with: writing compelling posts (hooks, storytelling, 3-5 hashtags, CTA, under 300 words), rewriting posts in different tones, generating A/B variants, recommending hashtags, scheduling advice, multi-language posts. Use markdown formatting.`
  },
  profile: {
    label: "Profile", icon: "👤",
    subFeatures: ["Profile Analyzer", "Resume Converter", "Keyword Gap Analyzer", "Profile Score"],
    system: `You are a LinkedIn profile expert for Ganesh Janawade. Help with: profile optimization (headline, about, experience bullets with metrics), converting resume/PDF content to LinkedIn format, keyword gap analysis between profile and job descriptions, profile completeness scoring. Use markdown with ## sections, **bold**, bullet points.`
  },
  jobs: {
    label: "Jobs", icon: "💼",
    subFeatures: ["Cover Letter", "Job Tracker", "Interview Q&A", "Salary Coach"],
    system: `You are a LinkedIn job search expert for Ganesh Janawade, a backend Java/Spring Boot engineer at Persistent Systems. Help with: auto-generating cover letters from job descriptions, interview Q&A practice, salary negotiation coaching, job application strategy. Use markdown formatting.`
  },
  network: {
    label: "Network", icon: "🤝",
    subFeatures: ["DM Templates", "Follow-up Reminders", "Connection Tracker"],
    system: `You are a LinkedIn networking coach for Ganesh Janawade. Help with: DM templates (recruiter, peer, senior engineer outreach), follow-up message strategies, connection growth tactics, engagement advice. Use markdown formatting.`
  }
};

const SUB_PROMPTS = {
  "Post Writer": "Write a compelling LinkedIn post for me. Ask me for the topic if I haven't provided one.",
  "Post Rewriter": "Help me rewrite a LinkedIn post in a different tone. Ask for the post and desired tone (formal/casual/inspirational/technical).",
  "A/B Variants": "Generate 2-3 A/B variants of a LinkedIn post with different hooks and angles. Ask me for the topic or original post.",
  "Hashtag Recommender": "Recommend the best 5-10 LinkedIn hashtags for a topic. Ask me for the topic.",
  "Multi-language": "Help me write or translate a LinkedIn post into another language. Ask me for the content and target language.",
  "Content Calendar": "Give me advice on the best times and days to post on LinkedIn for maximum reach, and help me plan a content calendar. (Note: this is a reminder/planning tool only — posts must be published manually.)",
  "Profile Analyzer": "Analyze my LinkedIn profile and give specific improvement recommendations. Ask me to share my headline, about section, and experience.",
  "Resume Converter": "Help me convert my resume content into an optimized LinkedIn profile. Ask me to share my resume details or upload a PDF.",
  "Keyword Gap Analyzer": "Analyze the keyword gaps between my LinkedIn profile and a target job description. Ask me to share both.",
  "Profile Score": "Score my LinkedIn profile completeness (out of 100) and tell me exactly what to improve. Ask me about each section.",
  "Cover Letter": "Generate a tailored cover letter for a job. Ask me to share the job description or upload a screenshot.",
  "Job Tracker": "Help me track my job applications. I'll tell you about jobs I've applied to and you help me organize status (applied/interview/rejected/offer).",
  "Interview Q&A": "Practice interview Q&A with me. Ask me what role/company I'm interviewing for and start with common questions.",
  "Salary Coach": "Coach me on salary negotiation for a software engineer role. Ask me about the offer and my experience level.",
  "DM Templates": "Generate LinkedIn DM templates for outreach. Ask me who I'm reaching out to (recruiter, peer, senior engineer, hiring manager).",
  "Follow-up Reminders": "Help me craft follow-up messages and create a follow-up schedule for my LinkedIn connections and job applications.",
  "Connection Tracker": "Help me track and analyze my LinkedIn network growth. Ask me about my current connections and goals."
};

// ─── MARKDOWN RENDERER ───────────────────────────────────────────────────────
function renderMarkdown(text) {
  const lines = text.split("\n");
  const els = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      els.push(<div key={i} style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",margin:"10px 0 4px",borderBottom:"1px solid var(--border)",paddingBottom:4}}>{line.slice(3)}</div>);
    } else if (line.startsWith("### ")) {
      els.push(<div key={i} style={{fontSize:12,fontWeight:600,color:"var(--accent)",margin:"8px 0 3px"}}>{line.slice(4)}</div>);
    } else if (line.startsWith("- ") || line.startsWith("• ")) {
      els.push(<div key={i} style={{display:"flex",gap:8,margin:"2px 0",alignItems:"flex-start"}}><span style={{color:"var(--accent)",marginTop:2,flexShrink:0}}>•</span><span>{inlineFormat(line.slice(2))}</span></div>);
    } else if (line.match(/^\d+\. /)) {
      const num = line.match(/^(\d+)\. /)[1];
      els.push(<div key={i} style={{display:"flex",gap:8,margin:"2px 0"}}><span style={{color:"var(--accent)",flexShrink:0,minWidth:16}}>{num}.</span><span>{inlineFormat(line.replace(/^\d+\. /,""))}</span></div>);
    } else if (line.trim().startsWith("|") && lines[i+1] && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i+1])) {
      // Markdown table detected: header row + separator row + data rows
      const headerCells = line.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
      i += 2; // skip header + separator
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
        rows.push(cells);
        i++;
      }
      i--; // compensate for outer i++ at loop end
      els.push(
        <div key={`table-${i}`} style={{overflowX:"auto",margin:"8px 0"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,background:"var(--surface2)",borderRadius:8,overflow:"hidden",border:"1px solid var(--border)"}}>
            <thead>
              <tr>
                {headerCells.map((h,hi) => (
                  <th key={hi} style={{textAlign:"left",padding:"7px 10px",background:"var(--accent-soft)",color:"var(--accent)",fontWeight:700,borderBottom:"1px solid var(--border)",whiteSpace:"nowrap"}}>
                    {inlineFormat(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row,ri) => (
                <tr key={ri} style={{background: ri % 2 === 0 ? "transparent" : "var(--code-bg)"}}>
                  {row.map((cell,ci) => (
                    <td key={ci} style={{padding:"7px 10px",color: ci===0 ? "var(--text-primary)" : "var(--text-secondary)",fontWeight: ci===0 ? 600 : 400,borderBottom: ri<rows.length-1 ? "1px solid var(--border)" : "none",verticalAlign:"top"}}>
                      {inlineFormat(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else if (line.startsWith("```")) {
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { code.push(lines[i]); i++; }
      els.push(<pre key={i} style={{background:"var(--code-bg)",border:"1px solid var(--border)",borderRadius:6,padding:"8px 12px",fontSize:11,overflowX:"auto",margin:"6px 0",color:"var(--text-primary)",fontFamily:"monospace"}}>{code.join("\n")}</pre>);
    } else if (line.trim() === "") {
      els.push(<div key={i} style={{height:5}}/>);
    } else {
      els.push(<div key={i} style={{margin:"1px 0",lineHeight:1.6}}>{inlineFormat(line)}</div>);
    }
    i++;
  }
  return els;
}
function inlineFormat(text) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p,i)=>{
    if (p.startsWith("**")&&p.endsWith("**")) return <strong key={i}>{p.slice(2,-2)}</strong>;
    if (p.startsWith("*")&&p.endsWith("*")) return <em key={i}>{p.slice(1,-1)}</em>;
    if (p.startsWith("`")&&p.endsWith("`")) return <code key={i} style={{background:"var(--code-bg)",borderRadius:3,padding:"1px 5px",fontSize:"0.88em",fontFamily:"monospace"}}>{p.slice(1,-1)}</code>;
    return p;
  });
}

// ─── TYPING DOTS ─────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{display:"flex",gap:5,padding:"6px 2px",alignItems:"center"}}>
      {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:"var(--text-tertiary)",animation:"bounce 1.2s infinite",animationDelay:`${i*0.2}s`}}/>)}
      <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}`}</style>
    </div>
  );
}

// ─── COPY BUTTON ─────────────────────────────────────────────────────────────
function CopyBtn({ text }) {
  const [open, setOpen] = useState(false);
  const taRef = useRef(null);
  const toggle = () => { setOpen(o=>!o); setTimeout(()=>{ taRef.current?.select(); taRef.current?.setSelectionRange(0,99999); },60); };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <button onClick={toggle} style={{background:"none",border:"1px solid var(--border)",borderRadius:6,padding:"3px 9px",fontSize:11,cursor:"pointer",color:open?"var(--accent)":"var(--text-tertiary)",display:"flex",alignItems:"center",gap:4}}>
        {open?"📋 Ctrl+A then Ctrl+C to copy":"⎘ Copy"}
      </button>
      {open && (
        <div style={{position:"relative"}}>
          <textarea ref={taRef} readOnly value={text} onClick={e=>{e.target.select();e.target.setSelectionRange(0,99999);}} style={{width:"100%",minHeight:70,maxHeight:140,background:"var(--code-bg)",border:"1px solid var(--accent)",borderRadius:8,padding:"8px 10px",fontSize:12,color:"var(--text-primary)",fontFamily:"inherit",resize:"vertical",lineHeight:1.5,boxSizing:"border-box",outline:"none"}}/>
          <button onClick={()=>setOpen(false)} style={{position:"absolute",top:4,right:4,background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:5,padding:"1px 6px",fontSize:10,cursor:"pointer",color:"var(--text-tertiary)"}}>✕</button>
        </div>
      )}
    </div>
  );
}

// ─── ATTACH MENU ─────────────────────────────────────────────────────────────
function AttachMenu({ onFile, onClose }) {
  const imgRef = useRef(), docRef = useRef(), anyRef = useRef();
  const menuRef = useRef();
  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const readFile = (file) => {
    const reader = new FileReader();
    reader.onload = ev => onFile({ base64: ev.target.result.split(",")[1], mediaType: file.type, previewUrl: ev.target.result, name: file.name });
    reader.readAsDataURL(file);
  };
  const items = [
    { icon:"🖼️", label:"Photo / Image", accept:"image/*", ref:imgRef },
    { icon:"📄", label:"PDF Resume / Document", accept:".pdf", ref:docRef },
    { icon:"📎", label:"Any File (doc, txt…)", accept:".doc,.docx,.txt,.csv,.pdf,image/*", ref:anyRef }
  ];
  return (
    <div ref={menuRef} style={{position:"absolute",bottom:46,left:0,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:6,minWidth:210,boxShadow:"0 8px 32px rgba(0,0,0,0.25)",zIndex:200}}>
      {items.map((item,i)=>(
        <div key={i}>
          <input ref={item.ref} type="file" accept={item.accept} style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f){readFile(f);onClose();}e.target.value="";}}/>
          <button onClick={()=>item.ref.current.click()} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 12px",background:"none",border:"none",cursor:"pointer",borderRadius:8,color:"var(--text-primary)",fontSize:13,textAlign:"left"}}>
            <span style={{fontSize:18,width:24,textAlign:"center"}}>{item.icon}</span><span>{item.label}</span>
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── FILE PREVIEW ────────────────────────────────────────────────────────────
function FilePreview({ file, onRemove }) {
  const isImg = file.mediaType?.startsWith("image/");
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:"6px 10px",marginBottom:6}}>
      {isImg
        ? <img src={file.previewUrl} alt="" style={{width:34,height:34,borderRadius:6,objectFit:"cover"}}/>
        : <div style={{width:34,height:34,borderRadius:6,background:"var(--accent-soft)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>
            {file.name?.endsWith(".pdf")?"📄":file.name?.endsWith(".doc")||file.name?.endsWith(".docx")?"📝":"📎"}
          </div>
      }
      <div style={{flex:1,overflow:"hidden"}}>
        <div style={{fontSize:12,color:"var(--text-primary)",fontWeight:500,textOverflow:"ellipsis",whiteSpace:"nowrap",overflow:"hidden"}}>{file.name}</div>
        <div style={{fontSize:10,color:"var(--text-tertiary)"}}>{file.mediaType}</div>
      </div>
      <button onClick={onRemove} style={{background:"none",border:"none",color:"var(--danger)",cursor:"pointer",fontSize:15}}>✕</button>
    </div>
  );
}

// ─── JOB TRACKER ─────────────────────────────────────────────────────────────
const STATUS_COLORS = { Applied:"#3b82f6", Interview:"#f59e0b", Rejected:"#ef4444", Offer:"#22c55e" };
function JobTracker({ jobs, setJobs }) {
  const [form, setForm] = useState({ company:"", role:"", status:"Applied", date: new Date().toISOString().slice(0,10) });
  const add = () => {
    if (!form.company || !form.role) return;
    setJobs(j=>[{id:Date.now(),...form},...j]);
    setForm({ company:"", role:"", status:"Applied", date:new Date().toISOString().slice(0,10) });
  };
  const statuses = ["Applied","Interview","Rejected","Offer"];
  return (
    <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:10,height:"100%",overflowY:"auto"}}>
      <div style={{fontSize:13,fontWeight:600,color:"var(--text-primary)"}}>📋 Job Tracker</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
        <input value={form.company} onChange={e=>setForm(f=>({...f,company:e.target.value}))} placeholder="Company" style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:"7px 10px",fontSize:12,color:"var(--text-primary)",outline:"none"}}/>
        <input value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} placeholder="Role" style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:"7px 10px",fontSize:12,color:"var(--text-primary)",outline:"none"}}/>
        <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:"7px 10px",fontSize:12,color:"var(--text-primary)",outline:"none"}}>
          {statuses.map(s=><option key={s}>{s}</option>)}
        </select>
        <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:"7px 10px",fontSize:12,color:"var(--text-primary)",outline:"none"}}/>
      </div>
      <button onClick={add} style={{background:"var(--accent)",border:"none",borderRadius:8,padding:"8px",fontSize:12,color:"white",cursor:"pointer",fontWeight:500}}>+ Add Job</button>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {statuses.map(s=>{
          const count = jobs.filter(j=>j.status===s).length;
          return <div key={s} style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:500,background:`${STATUS_COLORS[s]}22`,color:STATUS_COLORS[s],border:`1px solid ${STATUS_COLORS[s]}44`}}>{s}: {count}</div>;
        })}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {jobs.length===0
          ? <div style={{fontSize:12,color:"var(--text-tertiary)",textAlign:"center",padding:"20px 0"}}>No jobs tracked yet. Add your first one above!</div>
          : jobs.map(j=>(
            <div key={j.id} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:10}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--text-primary)"}}>{j.company}</div>
                <div style={{fontSize:11,color:"var(--text-secondary)"}}>{j.role} · {j.date}</div>
              </div>
              <select value={j.status} onChange={e=>setJobs(jobs=>jobs.map(jj=>jj.id===j.id?{...jj,status:e.target.value}:jj))} style={{background:`${STATUS_COLORS[j.status]}22`,border:`1px solid ${STATUS_COLORS[j.status]}55`,borderRadius:6,padding:"3px 8px",fontSize:11,color:STATUS_COLORS[j.status],outline:"none",fontWeight:500,cursor:"pointer"}}>
                {statuses.map(s=><option key={s}>{s}</option>)}
              </select>
              <button onClick={()=>setJobs(jobs=>jobs.filter(jj=>jj.id!==j.id))} style={{background:"none",border:"none",color:"var(--danger)",cursor:"pointer",fontSize:14,padding:"0 2px"}}>✕</button>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ─── POST SCHEDULER ──────────────────────────────────────────────────────────
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const HOURS = ["8am","9am","10am","12pm","1pm","5pm","6pm","7pm","8pm"];
const BEST = { Tue:["8am","12pm","5pm"], Wed:["9am","12pm","6pm"], Thu:["9am","1pm","5pm"] };
function ContentCalendar({ scheduled, setScheduled }) {
  const [form, setForm] = useState({ title:"", content:"", day:"Tue", time:"9am" });
  const [expandedId, setExpandedId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const taRefs = useRef({});

  const add = () => {
    if (!form.title) return;
    setScheduled(s=>[...s,{id:Date.now(),...form}]);
    setForm(f=>({...f,title:"",content:""}));
  };

  const copyAndOpen = (item) => {
    setExpandedId(item.id);
    setCopiedId(item.id);
    setTimeout(() => {
      const ta = taRefs.current[item.id];
      if (ta) { ta.select(); ta.setSelectionRange(0, 99999); }
    }, 50);
    window.open("https://www.linkedin.com/feed/", "_blank");
  };

  return (
    <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:10,height:"100%",overflowY:"auto"}}>
      <div style={{fontSize:13,fontWeight:600,color:"var(--text-primary)"}}>📅 Content Calendar</div>

      <div style={{background:"var(--accent-soft)",border:"1px solid var(--border)",borderRadius:8,padding:"8px 12px",fontSize:11.5,color:"var(--text-secondary)",lineHeight:1.5}}>
        ⚠️ <strong>Reminder only</strong> — this does not auto-post. You'll need to copy the text and post manually on LinkedIn when the time comes.
        <br/>💡 Best times: <strong>Tue–Thu, 8–10am or 5–7pm</strong> for max reach.
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Post title / topic..." style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:"7px 10px",fontSize:12,color:"var(--text-primary)",outline:"none"}}/>
        <textarea value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} placeholder="Paste the full post text here (optional, but needed for one-click copy later)..." rows={3} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:"7px 10px",fontSize:12,color:"var(--text-primary)",outline:"none",resize:"vertical",fontFamily:"inherit"}}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          <select value={form.day} onChange={e=>setForm(f=>({...f,day:e.target.value}))} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:"7px 10px",fontSize:12,color:"var(--text-primary)",outline:"none"}}>
            {DAYS.map(d=><option key={d}>{d}</option>)}
          </select>
          <select value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:"7px 10px",fontSize:12,color:"var(--text-primary)",outline:"none"}}>
            {HOURS.map(h=><option key={h}>{h}</option>)}
          </select>
        </div>
        <button onClick={add} style={{background:"var(--accent)",border:"none",borderRadius:8,padding:"8px",fontSize:12,color:"white",cursor:"pointer",fontWeight:500}}>+ Add to Calendar</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
        {DAYS.map(d=>(
          <div key={d} style={{textAlign:"center"}}>
            <div style={{fontSize:10,color:BEST[d]?"var(--accent)":"var(--text-tertiary)",fontWeight:BEST[d]?700:400,marginBottom:3}}>{d}</div>
            {(BEST[d]||[]).map(h=><div key={h} style={{fontSize:9,background:"var(--accent-soft)",color:"var(--accent)",borderRadius:3,padding:"1px 2px",marginBottom:2}}>{h}</div>)}
          </div>
        ))}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {scheduled.length===0
          ? <div style={{fontSize:12,color:"var(--text-tertiary)",textAlign:"center",padding:"12px 0"}}>No reminders yet. Add your first one above!</div>
          : scheduled.map(s=>(
            <div key={s.id} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:10,padding:"9px 12px",display:"flex",flexDirection:"column",gap:6}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:16}}>📝</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:500,color:"var(--text-primary)"}}>{s.title}</div>
                  <div style={{fontSize:11,color:"var(--text-tertiary)"}}>{s.day} · {s.time}{!s.content && " · no text saved"}</div>
                </div>
                <button onClick={()=>setScheduled(sc=>sc.filter(x=>x.id!==s.id))} style={{background:"none",border:"none",color:"var(--danger)",cursor:"pointer",fontSize:13}}>✕</button>
              </div>

              {s.content && (
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>copyAndOpen(s)} style={{flex:1,background:"var(--accent)",border:"none",borderRadius:7,padding:"6px 8px",fontSize:11,color:"white",cursor:"pointer",fontWeight:500,display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                    📋 Copy & Open LinkedIn
                  </button>
                  <button onClick={()=>setExpandedId(id=>id===s.id?null:s.id)} style={{background:"none",border:"1px solid var(--border)",borderRadius:7,padding:"6px 9px",fontSize:11,color:"var(--text-tertiary)",cursor:"pointer"}}>
                    {expandedId===s.id?"Hide":"Preview"}
                  </button>
                </div>
              )}

              {expandedId===s.id && s.content && (
                <div>
                  <textarea
                    ref={el => taRefs.current[s.id]=el}
                    readOnly
                    value={s.content}
                    onClick={e=>{e.target.select();e.target.setSelectionRange(0,99999);}}
                    style={{width:"100%",minHeight:70,maxHeight:140,background:"var(--code-bg)",border:`1px solid ${copiedId===s.id?"var(--accent)":"var(--border)"}`,borderRadius:8,padding:"7px 9px",fontSize:11.5,color:"var(--text-primary)",fontFamily:"inherit",resize:"vertical",lineHeight:1.5,boxSizing:"border-box",outline:"none"}}
                  />
                  <div style={{fontSize:10,color:"var(--text-tertiary)",marginTop:3}}>Click inside → Ctrl+A → Ctrl+C, then paste into the LinkedIn tab that opened.</div>
                </div>
              )}
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function LinkedInAgent() {
  const [darkMode, setDarkMode] = useState(true);
  const [mode, setMode] = useState("write");
  const [subFeature, setSubFeature] = useState("Post Writer");
  const [activePanel, setActivePanel] = useState("chat"); // chat | jobs | scheduler

  const WELCOME_MSG = {
    role:"agent",
    isModeSwitch: false,
    text:"Hi Ganesh Janawade! 👋 I'm your upgraded **LinkedIn Agent**.\n\nPick a mode and sub-feature from the tabs above, or use the quick actions below.\n\nNew features:\n- 📋 Job Tracker (track applications)\n- 📅 Content Calendar (plan & remind — manual posting)\n- 🔄 Post Rewriter, A/B Variants, Hashtag Recommender\n- 💬 Interview Q&A, Salary Coach\n- 📨 DM Templates & more!\n\nWhat would you like to do today?",
    showQuick:true
  };

  // ─── Per-sub-feature conversation store ──────────────────────────
  // conversations = { "write::Post Writer": { messages: [...], history: [...] }, ... }
  const [conversations, setConversations] = useState({
    "write::Post Writer": { messages: [WELCOME_MSG], history: [] }
  });

  const convoKey = `${mode}::${subFeature}`;
  const currentConvo = conversations[convoKey] || { messages: [], history: [] };
  const messages = currentConvo.messages;
  const history = currentConvo.history;

  const setMessagesFor = (key, updater) => {
    setConversations(prev => {
      const prevConvo = prev[key] || { messages: [], history: [] };
      const newMessages = typeof updater === "function" ? updater(prevConvo.messages) : updater;
      return { ...prev, [key]: { ...prevConvo, messages: newMessages } };
    });
  };
  const setHistoryFor = (key, updater) => {
    setConversations(prev => {
      const prevConvo = prev[key] || { messages: [], history: [] };
      const newHistory = typeof updater === "function" ? updater(prevConvo.history) : updater;
      return { ...prev, [key]: { ...prevConvo, history: newHistory } };
    });
  };
  // Convenience setters that always act on the CURRENT mode::subFeature
  const setMessages = (updater) => setMessagesFor(convoKey, updater);
  const setHistory = (updater) => setHistoryFor(convoKey, updater);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAttach, setShowAttach] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [jobs, setJobs] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [lang, setLang] = useState("English");
  const [storageReady, setStorageReady] = useState(false);
  const bottomRef = useRef(null);

  // ─── Load persisted data on mount ───────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const d = await window.storage.get("li_agent_drafts");
        if (d?.value) setDrafts(JSON.parse(d.value));
      } catch {}
      try {
        const j = await window.storage.get("li_agent_jobs");
        if (j?.value) setJobs(JSON.parse(j.value));
      } catch {}
      try {
        const s = await window.storage.get("li_agent_scheduled");
        if (s?.value) setScheduled(JSON.parse(s.value));
      } catch {}
      try {
        const t = await window.storage.get("li_agent_theme");
        if (t?.value) setDarkMode(JSON.parse(t.value));
      } catch {}
      try {
        const c = await window.storage.get("li_agent_conversations");
        if (c?.value) setConversations(JSON.parse(c.value));
      } catch {}
      setStorageReady(true);
    })();
  }, []);

  // ─── Persist on change (skip until initial load completes) ─────
  useEffect(() => { if (storageReady) window.storage.set("li_agent_drafts", JSON.stringify(drafts)).catch(()=>{}); }, [drafts, storageReady]);
  useEffect(() => { if (storageReady) window.storage.set("li_agent_jobs", JSON.stringify(jobs)).catch(()=>{}); }, [jobs, storageReady]);
  useEffect(() => { if (storageReady) window.storage.set("li_agent_scheduled", JSON.stringify(scheduled)).catch(()=>{}); }, [scheduled, storageReady]);
  useEffect(() => { if (storageReady) window.storage.set("li_agent_theme", JSON.stringify(darkMode)).catch(()=>{}); }, [darkMode, storageReady]);
  useEffect(() => { if (storageReady) window.storage.set("li_agent_conversations", JSON.stringify(conversations)).catch(()=>{}); }, [conversations, storageReady]);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages,loading]);

  // Switch sub-feature → go to its OWN saved conversation (don't wipe others)
  const handleSubFeature = (sf) => {
    const key = `${mode}::${sf}`;
    setSubFeature(sf);
    setActivePanel("chat");
    setPendingFile(null);
    if (sf==="Job Tracker") { setActivePanel("jobs"); return; }
    if (sf==="Content Calendar") { setActivePanel("scheduler"); return; }
    // If this sub-feature has never been opened before, kick it off with its intro prompt
    const alreadyStarted = conversations[key] && conversations[key].messages.length > 0;
    if (!alreadyStarted) {
      const prompt = SUB_PROMPTS[sf];
      if (prompt) sendMessageTo(key, prompt, true);
    }
  };

  const switchMode = (m) => {
    const firstSub = MODES[m].subFeatures[0];
    const key = `${m}::${firstSub}`;
    setMode(m);
    setSubFeature(firstSub);
    setPendingFile(null);
    setActivePanel("chat");
    // If this mode/sub-feature combo has no conversation yet, seed it with an intro message.
    // If it already has one, we just switch to it — nothing is cleared.
    setConversations(prev => {
      if (prev[key] && prev[key].messages.length > 0) return prev; // keep existing conversation
      return {
        ...prev,
        [key]: {
          messages: [{
            role: "agent",
            isModeSwitch: true,
            text: `**${MODES[m].icon} ${MODES[m].label}** mode active.\n\nSub-features: ${MODES[m].subFeatures.join(", ")}\n\nWhat would you like help with?`,
            showQuick: true
          }],
          history: []
        }
      };
    });
  };

  const saveDraft = (text) => {
    setDrafts(prev=>[{id:Date.now(),text,mode,subFeature,time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})},...prev.slice(0,19)]);
  };

  // Send a message to a SPECIFIC conversation key (used internally so in-flight
  // requests always land in the right place even if the user switches tabs meanwhile)
  const sendMessageTo = async (key, quickText, isSystem=false) => {
    const msg = quickText || input.trim();
    if ((!msg && !pendingFile) || loading) return;
    if (!isSystem) { setInput(""); setCharCount(0); }

    const [msgMode] = key.split("::");
    const currentSf = key.split("::")[1];

    let userContent = [];
    if (pendingFile) {
      if (pendingFile.mediaType?.startsWith("image/")) {
        // Images → image block
        userContent.push({
          type: "image",
          source: { type: "base64", media_type: pendingFile.mediaType, data: pendingFile.base64 }
        });
      } else if (pendingFile.mediaType === "application/pdf") {
        // PDFs → document block (Anthropic native PDF support)
        userContent.push({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: pendingFile.base64 }
        });
      } else if (pendingFile.mediaType?.includes("word") || pendingFile.name?.endsWith(".docx") || pendingFile.name?.endsWith(".doc")) {
        // Word docs → extract text via base64 decode and send as text block
        userContent.push({
          type: "text",
          text: `[Document attached: ${pendingFile.name}. The user wants you to analyze this document. Since direct Word file reading isn't supported here, please ask the user to paste the text content of their resume/document directly into the chat so you can help them.]`
        });
      } else {
        // Other text files (txt, csv) → decode base64 to text
        try {
          const decoded = atob(pendingFile.base64);
          userContent.push({ type: "text", text: `Content of ${pendingFile.name}:\n\n${decoded}` });
        } catch {
          userContent.push({ type: "text", text: `[File attached: ${pendingFile.name}]` });
        }
      }
    }
    if (msg) userContent.push({type:"text",text: lang!=="English" && currentSf==="Multi-language" ? `${msg} (Respond in ${lang})` : msg});
    const finalContent = userContent.length===1&&userContent[0].type==="text" ? msg : userContent;

    const baseHistory = (conversations[key] && conversations[key].history) || [];
    const newHistory = [...baseHistory,{role:"user",content:finalContent}];
    setHistoryFor(key, newHistory);
    if (!isSystem) setMessagesFor(key, prev=>[...prev,{
      role:"user",
      text: msg || "📎 File attached",
      image: pendingFile?.mediaType?.startsWith("image/") ? pendingFile.previewUrl : null,
      fileName: pendingFile && !pendingFile.mediaType?.startsWith("image/") ? pendingFile.name : null,
      fileType: pendingFile?.mediaType
    }]);
    else setMessagesFor(key, prev=>[...prev,{role:"agent",text:`Starting **${currentSf}**…`,isSystem:true}]);
    setPendingFile(null);
    setLoading(true);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-6",
          max_tokens:1500,
          system: MODES[msgMode].system + " You have access to web search — use it whenever the user asks about current trends, recent news, live job postings, or anything time-sensitive. Cite sources naturally in your response.",
          messages:newHistory,
          tools:[{ type:"web_search_20250305", name:"web_search" }]
        })
      });
      const data = await res.json();
      const reply = (data.content || [])
        .filter(b => b.type === "text")
        .map(b => b.text)
        .join("\n\n") || "Sorry, something went wrong.";
      const usedSearch = (data.content || []).some(b => b.type === "server_tool_use" && b.name === "web_search");
      setHistoryFor(key, h=>[...h,{role:"assistant",content:reply}]);
      setMessagesFor(key, prev=>[...prev,{role:"agent",text:reply,showQuick:true,usedSearch}]);
    } catch {
      setMessagesFor(key, prev=>[...prev,{role:"agent",text:"Connection error. Please try again."}]);
    }
    setLoading(false);
  };

  // Public sendMessage always targets the CURRENT conversation
  const sendMessage = (quickText, isSystem=false) => sendMessageTo(convoKey, quickText, isSystem);

  const handleKey = e => { if (e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();} };

  const theme = {
    "--bg": darkMode?"#0e0e10":"#f5f5f2",
    "--surface": darkMode?"#18181b":"#ffffff",
    "--surface2": darkMode?"#222226":"#f0f0ed",
    "--border": darkMode?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.09)",
    "--text-primary": darkMode?"#f0f0f0":"#1a1a1a",
    "--text-secondary": darkMode?"#a0a0a8":"#555",
    "--text-tertiary": darkMode?"#606068":"#999",
    "--accent":"#0A66C2",
    "--accent-soft": darkMode?"rgba(10,102,194,0.15)":"rgba(10,102,194,0.08)",
    "--code-bg": darkMode?"#111113":"#ebebea",
    "--danger":"#e05555",
  };

  const glassBg = (opacity=0.8) => darkMode?`rgba(18,18,21,${opacity})`:`rgba(255,255,255,${opacity})`;

  const quickActions = MODES[mode].subFeatures.slice(0,4);

  return (
    <div style={{...theme,fontFamily:"'Inter',-apple-system,sans-serif",height:"96vh",display:"flex",flexDirection:"column",color:"var(--text-primary)",borderRadius:14,overflow:"hidden",position:"relative"}}>

      {/* Background */}
      <div style={{position:"absolute",inset:0,zIndex:0,overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,background:`linear-gradient(135deg,${darkMode?"#0c0d12":"#f4f5f8"} 0%,${darkMode?"#0e0f16":"#eef0f5"} 100%)`}}/>
        <div style={{position:"absolute",inset:0,backgroundImage:`linear-gradient(rgba(10,102,194,${darkMode?"0.04":"0.025"}) 1px,transparent 1px),linear-gradient(90deg,rgba(10,102,194,${darkMode?"0.04":"0.025"}) 1px,transparent 1px)`,backgroundSize:"40px 40px"}}/>
        <div style={{position:"absolute",top:"-15%",left:"-8%",width:500,height:500,borderRadius:"50%",background:darkMode?"radial-gradient(circle,rgba(10,102,194,0.10) 0%,transparent 70%)":"radial-gradient(circle,rgba(10,102,194,0.06) 0%,transparent 70%)"}}/>
        <div style={{position:"absolute",bottom:"-10%",right:"-5%",width:400,height:400,borderRadius:"50%",background:darkMode?"radial-gradient(circle,rgba(10,102,194,0.07) 0%,transparent 70%)":"radial-gradient(circle,rgba(10,102,194,0.04) 0%,transparent 70%)"}}/>
      </div>

      <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",height:"100%"}}>

        {/* Header */}
        <div style={{background:glassBg(0.88),backdropFilter:"blur(14px)",borderBottom:"1px solid var(--border)",padding:"9px 16px",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:30,height:30,background:"#0A66C2",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:600}}>LinkedIn Agent</div>
            <div style={{fontSize:11,color:"var(--text-tertiary)"}}>Powered by Claude · Ganesh Janawade {storageReady && <span style={{color:"#22c55e"}}>· ✓ Synced</span>}</div>
          </div>
          {/* Panel toggles */}
          <button onClick={()=>setActivePanel(p=>p==="jobs"?"chat":"jobs")} style={{background:activePanel==="jobs"?"var(--accent-soft)":"var(--surface2)",border:`1px solid ${activePanel==="jobs"?"var(--accent)":"var(--border)"}`,borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:11,color:activePanel==="jobs"?"var(--accent)":"var(--text-secondary)",fontWeight:activePanel==="jobs"?600:400}}>
            📋 Jobs ({jobs.length})
          </button>
          <button onClick={()=>setActivePanel(p=>p==="scheduler"?"chat":"scheduler")} style={{background:activePanel==="scheduler"?"var(--accent-soft)":"var(--surface2)",border:`1px solid ${activePanel==="scheduler"?"var(--accent)":"var(--border)"}`,borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:11,color:activePanel==="scheduler"?"var(--accent)":"var(--text-secondary)",fontWeight:activePanel==="scheduler"?600:400}}>
            📅 Calendar ({scheduled.length})
          </button>
          <button onClick={()=>setDarkMode(d=>!d)} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:"5px 9px",cursor:"pointer",fontSize:13}}>
            {darkMode?"☀️":"🌙"}
          </button>
        </div>

        {/* Mode tabs */}
        <div style={{background:glassBg(0.78),backdropFilter:"blur(10px)",borderBottom:"1px solid var(--border)",padding:"7px 14px",display:"flex",gap:4,overflowX:"auto",flexShrink:0}}>
          {Object.entries(MODES).map(([key,val])=>(
            <button key={key} onClick={()=>switchMode(key)} style={{padding:"5px 13px",borderRadius:8,fontSize:12,cursor:"pointer",border:`1px solid ${mode===key?"var(--accent)":"var(--border)"}`,color:mode===key?"var(--accent)":"var(--text-secondary)",background:mode===key?"var(--accent-soft)":"transparent",whiteSpace:"nowrap",fontWeight:mode===key?600:400,transition:"all 0.15s"}}>
              {val.icon} {val.label}
            </button>
          ))}
        </div>

        {/* Sub-feature tabs */}
        <div style={{background:glassBg(0.65),backdropFilter:"blur(8px)",borderBottom:"1px solid var(--border)",padding:"6px 14px",display:"flex",gap:4,overflowX:"auto",flexShrink:0}}>
          {MODES[mode].subFeatures.map(sf=>{
            const hasHistory = conversations[`${mode}::${sf}`]?.messages?.length > 0;
            return (
              <button key={sf} onClick={()=>handleSubFeature(sf)} style={{padding:"4px 11px",borderRadius:20,fontSize:11,cursor:"pointer",border:`1px solid ${subFeature===sf?"var(--accent)":"var(--border)"}`,color:subFeature===sf?"white":"var(--text-tertiary)",background:subFeature===sf?"var(--accent)":"transparent",whiteSpace:"nowrap",fontWeight:subFeature===sf?600:400,transition:"all 0.15s",display:"flex",alignItems:"center",gap:5}}>
                {sf}
                {hasHistory && subFeature!==sf && <span style={{width:5,height:5,borderRadius:"50%",background:"#22c55e",flexShrink:0}}/>}
              </button>
            );
          })}
          {/* Language selector for multi-language */}
          {subFeature==="Multi-language" && (
            <select value={lang} onChange={e=>setLang(e.target.value)} style={{marginLeft:"auto",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:"3px 8px",fontSize:11,color:"var(--text-primary)",outline:"none"}}>
              {["English","Hindi","Tamil","Spanish","French","German","Japanese","Mandarin","Arabic","Portuguese"].map(l=><option key={l}>{l}</option>)}
            </select>
          )}
        </div>

        {/* Body */}
        <div style={{flex:1,display:"flex",overflow:"hidden",position:"relative"}}>

          {/* Sidebar */}
          <div style={{width:sidebarOpen?215:0,flexShrink:0,background:glassBg(0.82),backdropFilter:"blur(10px)",borderRight:sidebarOpen?"1px solid var(--border)":"none",display:"flex",flexDirection:"column",overflow:"hidden",transition:"width 0.25s ease"}}>
            {sidebarOpen && (<>
              <div style={{padding:"10px 12px 8px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid var(--border)",flexShrink:0}}>
                <span style={{fontSize:11,fontWeight:600,color:"var(--text-tertiary)",textTransform:"uppercase",letterSpacing:"0.06em",whiteSpace:"nowrap"}}>💾 Saved Drafts</span>
                <button onClick={()=>setSidebarOpen(false)} title="Collapse sidebar" style={{background:"none",border:"1px solid var(--border)",borderRadius:6,width:22,height:22,cursor:"pointer",color:"var(--text-tertiary)",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>◀</button>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"6px 8px"}}>
                {drafts.length===0
                  ? <div style={{fontSize:12,color:"var(--text-tertiary)",padding:"10px 6px",lineHeight:1.5}}>No drafts yet.<br/>Click 💾 Save on any response.</div>
                  : drafts.map(d=>(
                    <div key={d.id} onClick={()=>setInput(d.text)} style={{padding:"8px 10px",borderRadius:8,marginBottom:4,background:"var(--surface2)",border:"1px solid var(--border)",cursor:"pointer"}}>
                      <div style={{fontSize:10,color:"var(--text-tertiary)",marginBottom:3}}>{MODES[d.mode]?.icon} {d.subFeature} · {d.time}</div>
                      <div style={{fontSize:12,color:"var(--text-secondary)",overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{d.text.slice(0,80)}…</div>
                    </div>
                  ))
                }
              </div>
              <div style={{padding:"8px 12px",borderTop:"1px solid var(--border)",flexShrink:0}}>
                <div style={{fontSize:11,color:"var(--text-tertiary)",lineHeight:1.6}}>claude-sonnet-4-6<br/>Images · PDF · DOC supported</div>
                <button onClick={async()=>{
                  if(!confirm("Clear all saved drafts, jobs, scheduled posts, AND all chat conversations? This cannot be undone.")) return;
                  setDrafts([]); setJobs([]); setScheduled([]);
                  setConversations({ "write::Post Writer": { messages: [WELCOME_MSG], history: [] } });
                  try{
                    await window.storage.delete("li_agent_drafts");
                    await window.storage.delete("li_agent_jobs");
                    await window.storage.delete("li_agent_scheduled");
                    await window.storage.delete("li_agent_conversations");
                  }catch{}
                }} style={{marginTop:8,width:"100%",background:"none",border:"1px solid var(--border)",borderRadius:6,padding:"5px 8px",fontSize:10,color:"var(--danger)",cursor:"pointer"}}>
                  🗑️ Clear all saved data
                </button>
              </div>
            </>)}
          </div>

          {/* Expand sidebar button */}
          {!sidebarOpen && (
            <button onClick={()=>setSidebarOpen(true)} style={{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",zIndex:10,background:glassBg(0.92),border:"1px solid var(--border)",borderLeft:"none",borderRadius:"0 8px 8px 0",padding:"10px 6px",cursor:"pointer",color:"var(--text-tertiary)",fontSize:12,display:"flex",alignItems:"center",backdropFilter:"blur(8px)"}}>▶</button>
          )}

          {/* Main panel */}
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

            {/* Job Tracker panel */}
            {activePanel==="jobs" && (
              <div style={{flex:1,overflow:"hidden"}}>
                <JobTracker jobs={jobs} setJobs={setJobs}/>
              </div>
            )}

            {/* Scheduler panel */}
            {activePanel==="scheduler" && (
              <div style={{flex:1,overflow:"hidden"}}>
                <ContentCalendar scheduled={scheduled} setScheduled={setScheduled}/>
              </div>
            )}

            {/* Chat panel */}
            {activePanel==="chat" && (<>
              <div style={{flex:1,overflowY:"auto",padding:"14px 14px",display:"flex",flexDirection:"column",gap:12}}>
                {messages.map((msg,i)=>(
                  <div key={i}>
                    <div style={{display:"flex",gap:10,flexDirection:msg.role==="user"?"row-reverse":"row"}}>
                      {!msg.isSystem && (
                        <div style={{width:27,height:27,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,background:msg.role==="user"?"var(--surface2)":"#0A66C2",color:msg.role==="user"?"var(--text-secondary)":"white",border:msg.role==="user"?"1px solid var(--border)":"none"}}>
                          {msg.role==="user"?"G":"Li"}
                        </div>
                      )}
                      <div style={{maxWidth: msg.role==="agent" ? "92%" : "78%"}}>
                        {msg.image && <img src={msg.image} alt="" style={{maxWidth:180,maxHeight:130,borderRadius:8,display:"block",marginBottom:6,border:"1px solid var(--border)"}}/>}
                        {msg.fileName && <div style={{display:"flex",alignItems:"center",gap:6,background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:"5px 10px",marginBottom:6,fontSize:12,color:"var(--text-secondary)"}}>
                          {msg.fileType==="application/pdf" ? "📄" : msg.fileType?.includes("word") ? "📝" : "📎"} {msg.fileName}
                          {msg.fileType==="application/pdf" && <span style={{fontSize:10,color:"var(--accent)",marginLeft:4}}>✓ PDF sent to Claude</span>}
                        </div>}
                        {msg.usedSearch && (
                          <div style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:10,color:"var(--accent)",background:"var(--accent-soft)",border:"1px solid var(--border)",borderRadius:20,padding:"2px 8px",marginBottom:5}}>
                            🌐 Searched the web
                          </div>
                        )}
                        {msg.text && (
                          <div style={{padding:"9px 13px",borderRadius:msg.role==="user"?"13px 2px 13px 13px":msg.isSystem?"8px":"2px 13px 13px 13px",fontSize:13,lineHeight:1.65,background:msg.role==="user"?"var(--accent)":msg.isSystem?"var(--accent-soft)":darkMode?"rgba(32,32,36,0.92)":"rgba(255,255,255,0.92)",color:msg.role==="user"?"white":msg.isSystem?"var(--accent)":"var(--text-primary)",border:msg.role==="user"||msg.isSystem?"none":`1px solid var(--border)`,backdropFilter:"blur(6px)",fontStyle:msg.isSystem?"italic":"normal"}}>
                            {msg.role==="agent"&&!msg.isSystem ? renderMarkdown(msg.text) : msg.text}
                          </div>
                        )}
                        {msg.role==="agent"&&!msg.isSystem&&msg.text&&(
                          <div style={{display:"flex",gap:6,marginTop:5,flexWrap:"wrap"}}>
                            <CopyBtn text={msg.text}/>
                            <button onClick={()=>saveDraft(msg.text)} style={{background:"none",border:"1px solid var(--border)",borderRadius:6,padding:"3px 9px",fontSize:11,cursor:"pointer",color:"var(--text-tertiary)",display:"flex",alignItems:"center",gap:4}}>💾 Save</button>
                            <button onClick={()=>window.open("https://www.linkedin.com/feed/","_blank")} style={{background:"none",border:"1px solid var(--border)",borderRadius:6,padding:"3px 9px",fontSize:11,cursor:"pointer",color:"var(--text-tertiary)",display:"flex",alignItems:"center",gap:4}}>🔗 Open LinkedIn</button>
                          </div>
                        )}
                      </div>
                    </div>
                    {msg.showQuick&&msg.role==="agent"&&!msg.isSystem&&(
                      <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:7,paddingLeft:37}}>
                        {quickActions.map((a,j)=>(
                          <button key={j} onClick={()=>handleSubFeature(a)} style={{padding:"4px 10px",borderRadius:8,fontSize:11,border:"1px solid var(--border)",background:darkMode?"rgba(24,24,27,0.8)":"rgba(255,255,255,0.8)",color:"var(--text-secondary)",cursor:"pointer",backdropFilter:"blur(4px)"}}>
                            {a}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div style={{display:"flex",gap:10}}>
                    <div style={{width:27,height:27,borderRadius:"50%",background:"#0A66C2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"white",flexShrink:0}}>Li</div>
                    <div style={{padding:"9px 13px",borderRadius:"2px 13px 13px 13px",background:darkMode?"rgba(32,32,36,0.92)":"rgba(255,255,255,0.92)",border:"1px solid var(--border)"}}><TypingDots/></div>
                  </div>
                )}
                <div ref={bottomRef}/>
              </div>

              {/* Input */}
              <div style={{padding:"9px 14px 11px",background:glassBg(0.88),backdropFilter:"blur(12px)",borderTop:"1px solid var(--border)",position:"relative"}}>
                {pendingFile && <FilePreview file={pendingFile} onRemove={()=>setPendingFile(null)}/>}
                <div style={{display:"flex",gap:7,alignItems:"flex-end",position:"relative"}}>
                  <div style={{position:"relative"}}>
                    <button onClick={()=>setShowAttach(o=>!o)} title="Attach file" style={{width:35,height:35,borderRadius:8,border:`1px solid ${showAttach?"var(--accent)":"var(--border)"}`,background:showAttach?"var(--accent-soft)":"var(--surface2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:showAttach?"var(--accent)":"var(--text-tertiary)",flexShrink:0,transition:"all 0.15s"}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>
                    </button>
                    {showAttach && <AttachMenu onFile={f=>{setPendingFile(f);setShowAttach(false);}} onClose={()=>setShowAttach(false)}/>}
                  </div>
                  <div style={{flex:1,position:"relative"}}>
                    <textarea
                      value={input}
                      onChange={e=>{setInput(e.target.value);setCharCount(e.target.value.length);}}
                      onKeyDown={handleKey}
                      placeholder={pendingFile?"Add a message with your file...":"Ask your LinkedIn agent anything..."}
                      rows={1}
                      style={{width:"100%",background:"var(--surface2)",border:`1px solid ${charCount>2800?"var(--danger)":"var(--border)"}`,borderRadius:10,padding:"8px 12px",fontSize:13,color:"var(--text-primary)",resize:"none",fontFamily:"inherit",minHeight:38,maxHeight:110,outline:"none",boxSizing:"border-box"}}
                    />
                    {(mode==="write"||subFeature==="Post Writer") && charCount>0 && (
                      <div style={{position:"absolute",bottom:5,right:8,fontSize:10,color:charCount>2800?"var(--danger)":"var(--text-tertiary)"}}>{charCount}/3000</div>
                    )}
                  </div>
                  <button onClick={()=>sendMessage()} disabled={loading||(!input.trim()&&!pendingFile)} style={{width:35,height:35,borderRadius:8,background:"var(--accent)",border:"none",cursor:(loading||(!input.trim()&&!pendingFile))?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,opacity:(loading||(!input.trim()&&!pendingFile))?0.4:1}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                  </button>
                </div>
              </div>
            </>)}
          </div>
        </div>
      </div>
    </div>
  );
}
