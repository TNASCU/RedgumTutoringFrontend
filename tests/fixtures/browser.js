// In-memory API for browser smoke tests only. Never imported by the application.
(() => {
  const nativeFetch = window.fetch.bind(window);
  const iso = d => [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
  const monday = new Date(); monday.setDate(monday.getDate()-(monday.getDay()+6)%7); monday.setHours(12,0,0,0);
  const dateAt = offset => { const d = new Date(monday); d.setDate(d.getDate()+offset); return iso(d); };
  const subjects = [{subjectId:42,subjectName:'Physics',subjectClass:'Year 11'},{subjectId:43,subjectName:'Physics',subjectClass:'Year 12'}];
  let students = [{studentId:7,studentName:'Test Student',isActive:true,notes:'Important note\nYear: 11\nSchool: Test School',mediaConsent:true,firstAidNeeded:false,shareProgress:true,availabilityNotes:'Tuesday only',subjects:[subjects[0]],guardians:[{guardianId:11,guardianName:'Test Guardian',guardianPhone:'0400000000',guardianEmail:'test@example.com',relationship:'Parent',isPrimary:true},{guardianId:12,guardianName:'Second Guardian',guardianPhone:'0400000001',relationship:'Aunt',isPrimary:false}]}];
  let tutors = [{tutorId:9,tutorName:'Test Tutor',phone:'0400000002',maxSessionsPw:8,isActive:true,subjects,availability:[{tutorAvailabilityId:1,dayOfWeek:2,startTime:'15:00:00',endTime:'20:00:00'}]}];
  let sessions = [{sessionId:3,studentId:7,tutorId:9,subjectId:42,sessionDate:dateAt(1),startTime:'15:30:00',duration:90,status:'booked',notes:'Keep admin notes',lessonNotes:'Keep lesson notes'}];
  const detail = s => ({...s,student:students.find(x=>x.studentId===s.studentId),tutor:tutors.find(x=>x.tutorId===s.tutorId),subject:subjects.find(x=>x.subjectId===s.subjectId)});
  window.__test = {requests:[],failNext:null,students:()=>students,sessions:()=>sessions,dateAt};
  window.fetch = async (input, options={}) => {
    const url=new URL(input,location.origin);
    if(!url.pathname.startsWith('/api/')) return nativeFetch(input,options);
    if(options.signal?.aborted) throw new DOMException('Aborted','AbortError');
    const path=url.pathname.replace('/api/',''), method=options.method||'GET';
    const body=options.body?JSON.parse(options.body):undefined;
    window.__test.requests.push({path,method,query:url.search,body});
    const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
    if(window.__test.failNext && path.includes(window.__test.failNext)){window.__test.failNext=null;return reply({detail:'Test server unavailable'},503);}
    if(path==='Students' && method==='GET') return reply(students);
    if(path==='Students' && method==='POST') {const s={...body,studentId:8,isActive:true,subjects:body.subjects.map(x=>subjects.find(s=>s.subjectId===x.subjectId)),guardians:body.guardians.map((g,i)=>({...g,guardianId:20+i,isPrimary:i===0}))};students.push(s);return reply(s);}
    if(path.startsWith('Students/')) {const id=Number(path.split('/')[1]);let s=students.find(x=>x.studentId===id);if(method==='PUT'){s={...s,...body,subjects:body.subjects.map(x=>subjects.find(s=>s.subjectId===x.subjectId)),guardians:body.guardians.map((g,i)=>({...g,isPrimary:i===0}))};students=students.map(x=>x.studentId===id?s:x);}if(path.endsWith('/deactivate'))s.isActive=false;return reply(s);}
    if(path==='Tutors') return reply(tutors);
    if(path.startsWith('Tutors/') && path.includes('/availability')) {
      const tutor = tutors.find(t => t.tutorId === Number(path.split('/')[1]));
      if (method === 'POST') {
        if (tutor.availability.some(a => a.dayOfWeek === body.dayOfWeek && a.startTime < body.endTime && body.startTime < a.endTime)) return reply({ availability: ['Availability overlaps an existing slot.'] }, 400);
        const slot = { ...body, tutorAvailabilityId: 2 }; tutor.availability.push(slot); return reply(slot, 201);
      }
      if (method === 'DELETE') { tutor.availability = tutor.availability.filter(a => a.tutorAvailabilityId !== Number(path.split('/')[3])); return new Response(null, { status: 204 }); }
    }
    if(path.startsWith('Tutors/')) {if(path.endsWith('/subjects'))return reply(subjects);if(path.endsWith('/schedule'))return reply({days:[{sessions}]});if(method==='PUT')tutors[0]={...tutors[0],...body,subjects:body.subjectIds.map(id=>subjects.find(s=>s.subjectId===id))};return reply(tutors[0]);}
    if(path==='Sessions/week-schedule') {const start=new Date(url.searchParams.get('weekStart')+'T12:00:00');return reply(Object.fromEntries(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map((key,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return [key,{sessions:sessions.filter(s=>s.sessionDate===iso(d))}];})));}
    if(path==='Sessions' && method==='GET')return reply(sessions.filter(s=>(!url.searchParams.get('startDate')||s.sessionDate>=url.searchParams.get('startDate'))&&(!url.searchParams.get('endDate')||s.sessionDate<=url.searchParams.get('endDate'))).map(detail));
    if(path.includes('/history'))return reply(sessions.filter(s=>s.studentId===Number(path.split('/')[2])).map(detail));
    if(path==='Sessions/copy-week-forward')return reply({targetWeekStart:dateAt(7),copiedCount:1,skippedCount:0});
    if(path==='Sessions' && method==='POST'){const s={...body,sessionId:4};sessions.push(s);return reply(s);}
    if(path.startsWith('Sessions/')){const id=Number(path.split('/')[1]);let s=sessions.find(x=>x.sessionId===id);if(method==='PUT'||method==='PATCH'){s={...s,...body};sessions=sessions.map(x=>x.sessionId===id?s:x);}return reply(detail(s));}
    return reply({detail:'Unexpected mock route: '+method+' '+path},404);
  };
})();
