import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
  R2: R2Bucket
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for API routes
app.use('/api/*', cors())

// ============================================
// EXPERIENCES API ROUTES
// ============================================

// GET all experiences (ordered by date, most recent first)
app.get('/api/experiences', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT e.*, 
             GROUP_CONCAT(DISTINCT s.name || ':' || s.category) as skills
      FROM experiences e
      LEFT JOIN experience_skills es ON e.id = es.experience_id
      LEFT JOIN skills s ON es.skill_id = s.id
      GROUP BY e.id
      ORDER BY e.start_date DESC, e.created_at DESC
    `).all()

    // Parse skills from concatenated string
    const experiences = results.map((exp: any) => ({
      ...exp,
      is_current: Boolean(exp.is_current),
      skills: exp.skills ? exp.skills.split(',').map((s: string) => {
        const [name, category] = s.split(':')
        return { name, category }
      }) : []
    }))

    return c.json({ experiences })
  } catch (error) {
    return c.json({ error: 'Failed to fetch experiences' }, 500)
  }
})

// GET single experience by ID
app.get('/api/experiences/:id', async (c) => {
  const id = c.req.param('id')
  
  try {
    const experience = await c.env.DB.prepare(`
      SELECT * FROM experiences WHERE id = ?
    `).bind(id).first()

    if (!experience) {
      return c.json({ error: 'Experience not found' }, 404)
    }

    // Get associated skills
    const { results: skills } = await c.env.DB.prepare(`
      SELECT s.*, es.proficiency_level
      FROM skills s
      JOIN experience_skills es ON s.id = es.skill_id
      WHERE es.experience_id = ?
    `).bind(id).all()

    // Get associated documents
    const { results: documents } = await c.env.DB.prepare(`
      SELECT * FROM documents WHERE experience_id = ?
    `).bind(id).all()

    return c.json({
      ...experience,
      is_current: Boolean(experience.is_current),
      skills,
      documents
    })
  } catch (error) {
    return c.json({ error: 'Failed to fetch experience' }, 500)
  }
})

// POST create new experience
app.post('/api/experiences', async (c) => {
  try {
    const body = await c.req.json()
    const { company, position, location, start_date, end_date, is_current, description, achievements, skills } = body

    // Validate required fields
    if (!company || !position || !start_date) {
      return c.json({ error: 'Missing required fields: company, position, start_date' }, 400)
    }

    // Insert experience
    const result = await c.env.DB.prepare(`
      INSERT INTO experiences (company, position, location, start_date, end_date, is_current, description, achievements)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      company,
      position,
      location || null,
      start_date,
      end_date || null,
      is_current ? 1 : 0,
      description || null,
      achievements || null
    ).run()

    const experienceId = result.meta.last_row_id

    // Add skills if provided
    if (skills && Array.isArray(skills)) {
      for (const skill of skills) {
        // Ensure skill exists
        let skillId = skill.id
        if (!skillId) {
          const skillResult = await c.env.DB.prepare(`
            INSERT OR IGNORE INTO skills (name, category) VALUES (?, ?)
          `).bind(skill.name, skill.category || 'Other').run()
          
          if (skillResult.meta.last_row_id) {
            skillId = skillResult.meta.last_row_id
          } else {
            const existing = await c.env.DB.prepare(`
              SELECT id FROM skills WHERE name = ?
            `).bind(skill.name).first()
            skillId = existing?.id
          }
        }

        // Link skill to experience
        await c.env.DB.prepare(`
          INSERT OR IGNORE INTO experience_skills (experience_id, skill_id, proficiency_level)
          VALUES (?, ?, ?)
        `).bind(experienceId, skillId, skill.proficiency_level || 'Intermediate').run()
      }
    }

    return c.json({ id: experienceId, message: 'Experience created successfully' }, 201)
  } catch (error) {
    console.error('Error creating experience:', error)
    return c.json({ error: 'Failed to create experience' }, 500)
  }
})

// PUT update experience
app.put('/api/experiences/:id', async (c) => {
  const id = c.req.param('id')
  
  try {
    const body = await c.req.json()
    const { company, position, location, start_date, end_date, is_current, description, achievements, skills } = body

    // Update experience
    await c.env.DB.prepare(`
      UPDATE experiences 
      SET company = ?, position = ?, location = ?, start_date = ?, end_date = ?, 
          is_current = ?, description = ?, achievements = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      company,
      position,
      location || null,
      start_date,
      end_date || null,
      is_current ? 1 : 0,
      description || null,
      achievements || null,
      id
    ).run()

    // Update skills - remove old and add new
    await c.env.DB.prepare(`
      DELETE FROM experience_skills WHERE experience_id = ?
    `).bind(id).run()

    if (skills && Array.isArray(skills)) {
      for (const skill of skills) {
        let skillId = skill.id
        if (!skillId) {
          const skillResult = await c.env.DB.prepare(`
            INSERT OR IGNORE INTO skills (name, category) VALUES (?, ?)
          `).bind(skill.name, skill.category || 'Other').run()
          
          if (skillResult.meta.last_row_id) {
            skillId = skillResult.meta.last_row_id
          } else {
            const existing = await c.env.DB.prepare(`
              SELECT id FROM skills WHERE name = ?
            `).bind(skill.name).first()
            skillId = existing?.id
          }
        }

        await c.env.DB.prepare(`
          INSERT OR IGNORE INTO experience_skills (experience_id, skill_id, proficiency_level)
          VALUES (?, ?, ?)
        `).bind(id, skillId, skill.proficiency_level || 'Intermediate').run()
      }
    }

    return c.json({ message: 'Experience updated successfully' })
  } catch (error) {
    console.error('Error updating experience:', error)
    return c.json({ error: 'Failed to update experience' }, 500)
  }
})

// DELETE experience
app.delete('/api/experiences/:id', async (c) => {
  const id = c.req.param('id')
  
  try {
    await c.env.DB.prepare(`
      DELETE FROM experiences WHERE id = ?
    `).bind(id).run()

    return c.json({ message: 'Experience deleted successfully' })
  } catch (error) {
    return c.json({ error: 'Failed to delete experience' }, 500)
  }
})

// ============================================
// SKILLS API ROUTES
// ============================================

// GET all skills
app.get('/api/skills', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT s.*, COUNT(DISTINCT es.experience_id) as usage_count
      FROM skills s
      LEFT JOIN experience_skills es ON s.id = es.skill_id
      GROUP BY s.id
      ORDER BY s.category, s.name
    `).all()

    return c.json({ skills: results })
  } catch (error) {
    return c.json({ error: 'Failed to fetch skills' }, 500)
  }
})

// POST create new skill
app.post('/api/skills', async (c) => {
  try {
    const body = await c.req.json()
    const { name, category } = body

    if (!name) {
      return c.json({ error: 'Missing required field: name' }, 400)
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO skills (name, category) VALUES (?, ?)
    `).bind(name, category || 'Other').run()

    return c.json({ id: result.meta.last_row_id, message: 'Skill created successfully' }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to create skill' }, 500)
  }
})

// DELETE skill
app.delete('/api/skills/:id', async (c) => {
  const id = c.req.param('id')
  
  try {
    await c.env.DB.prepare(`
      DELETE FROM skills WHERE id = ?
    `).bind(id).run()

    return c.json({ message: 'Skill deleted successfully' })
  } catch (error) {
    return c.json({ error: 'Failed to delete skill' }, 500)
  }
})

// ============================================
// DOCUMENTS API ROUTES
// ============================================

// GET all documents
app.get('/api/documents', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT d.*, e.company, e.position
      FROM documents d
      LEFT JOIN experiences e ON d.experience_id = e.id
      ORDER BY d.created_at DESC
    `).all()

    return c.json({ documents: results })
  } catch (error) {
    return c.json({ error: 'Failed to fetch documents' }, 500)
  }
})

// POST upload document
app.post('/api/documents/upload', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const experienceId = formData.get('experience_id') as string

    if (!file || !title) {
      return c.json({ error: 'Missing required fields: file, title' }, 400)
    }

    // Generate unique key for R2
    const timestamp = Date.now()
    const r2Key = `documents/${timestamp}-${file.name}`

    // Upload to R2
    await c.env.R2.put(r2Key, file)

    // Save metadata to D1
    const result = await c.env.DB.prepare(`
      INSERT INTO documents (experience_id, title, file_name, file_type, file_size, r2_key, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      experienceId || null,
      title,
      file.name,
      file.type,
      file.size,
      r2Key,
      description || null
    ).run()

    return c.json({ 
      id: result.meta.last_row_id, 
      r2_key: r2Key,
      message: 'Document uploaded successfully' 
    }, 201)
  } catch (error) {
    console.error('Error uploading document:', error)
    return c.json({ error: 'Failed to upload document' }, 500)
  }
})

// GET download document
app.get('/api/documents/:id/download', async (c) => {
  const id = c.req.param('id')
  
  try {
    const doc = await c.env.DB.prepare(`
      SELECT * FROM documents WHERE id = ?
    `).bind(id).first()

    if (!doc) {
      return c.json({ error: 'Document not found' }, 404)
    }

    const object = await c.env.R2.get(doc.r2_key as string)
    
    if (!object) {
      return c.json({ error: 'File not found in storage' }, 404)
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': doc.file_type as string || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${doc.file_name}"`
      }
    })
  } catch (error) {
    return c.json({ error: 'Failed to download document' }, 500)
  }
})

// DELETE document
app.delete('/api/documents/:id', async (c) => {
  const id = c.req.param('id')
  
  try {
    const doc = await c.env.DB.prepare(`
      SELECT r2_key FROM documents WHERE id = ?
    `).bind(id).first()

    if (doc) {
      // Delete from R2
      await c.env.R2.delete(doc.r2_key as string)
    }

    // Delete from D1
    await c.env.DB.prepare(`
      DELETE FROM documents WHERE id = ?
    `).bind(id).run()

    return c.json({ message: 'Document deleted successfully' })
  } catch (error) {
    return c.json({ error: 'Failed to delete document' }, 500)
  }
})

// ============================================
// EXPORT API ROUTES
// ============================================

// GET export CV as Markdown
app.get('/api/export/markdown', async (c) => {
  try {
    const { results: experiences } = await c.env.DB.prepare(`
      SELECT * FROM experiences ORDER BY start_date DESC
    `).all()

    let markdown = '# Curriculum Vitae\\n\\n'
    markdown += '## Expériences Professionnelles\\n\\n'

    for (const exp of experiences as any[]) {
      const startDate = new Date(exp.start_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      const endDate = exp.end_date ? new Date(exp.end_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'Présent'
      
      markdown += `### ${exp.position} — ${exp.company}\\n`
      markdown += `*${startDate} – ${endDate}*\\n`
      if (exp.location) markdown += `📍 ${exp.location}\\n`
      markdown += '\\n'
      if (exp.description) markdown += `${exp.description}\\n\\n`
      if (exp.achievements) markdown += `${exp.achievements}\\n\\n`

      // Get skills for this experience
      const { results: skills } = await c.env.DB.prepare(`
        SELECT s.name, s.category
        FROM skills s
        JOIN experience_skills es ON s.id = es.skill_id
        WHERE es.experience_id = ?
      `).bind(exp.id).all()

      if (skills && skills.length > 0) {
        markdown += '**Compétences:** '
        markdown += (skills as any[]).map(s => s.name).join(', ')
        markdown += '\\n\\n'
      }

      markdown += '---\\n\\n'
    }

    return new Response(markdown, {
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': 'attachment; filename="cv.md"'
      }
    })
  } catch (error) {
    return c.json({ error: 'Failed to export CV' }, 500)
  }
})

// ============================================
// MAIN ROUTE - Frontend HTML (INLINE)
// ============================================

app.get('/', (c) => {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Career Manager</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
<style>
@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.fade-in { animation: fadeIn 0.5s ease-out; }
.timeline-item::before { content: ''; position: absolute; left: -10px; top: 0; width: 20px; height: 20px; background: white; border: 4px solid #3b82f6; border-radius: 50%; }
.timeline-item::after { content: ''; position: absolute; left: 0; top: 20px; width: 2px; height: calc(100% + 20px); background: #e5e7eb; }
.timeline-item:last-child::after { display: none; }
</style>
</head>
<body class="bg-gradient-to-br from-blue-50 to-purple-50 min-h-screen">
<nav class="bg-white shadow-md sticky top-0 z-50">
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
<div class="flex justify-between h-16 items-center">
<div class="flex items-center space-x-3">
<i class="fas fa-briefcase text-3xl text-blue-600"></i>
<h1 class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Career Manager</h1>
</div>
<div class="flex space-x-4">
<button onclick="showAddExperienceModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition flex items-center space-x-2">
<i class="fas fa-plus"></i><span>Nouvelle Expérience</span>
</button>
<button onclick="exportCV()" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition flex items-center space-x-2">
<i class="fas fa-download"></i><span>Exporter CV</span>
</button>
</div>
</div>
</div>
</nav>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
<div class="bg-white rounded-xl shadow-md p-6 fade-in">
<div class="flex items-center justify-between">
<div><p class="text-gray-500 text-sm">Expériences</p><p id="stats-experiences" class="text-3xl font-bold text-blue-600">0</p></div>
<i class="fas fa-briefcase text-4xl text-blue-200"></i>
</div>
</div>
<div class="bg-white rounded-xl shadow-md p-6 fade-in">
<div class="flex items-center justify-between">
<div><p class="text-gray-500 text-sm">Compétences</p><p id="stats-skills" class="text-3xl font-bold text-purple-600">0</p></div>
<i class="fas fa-star text-4xl text-purple-200"></i>
</div>
</div>
<div class="bg-white rounded-xl shadow-md p-6 fade-in">
<div class="flex items-center justify-between">
<div><p class="text-gray-500 text-sm">Documents</p><p id="stats-documents" class="text-3xl font-bold text-green-600">0</p></div>
<i class="fas fa-file-alt text-4xl text-green-200"></i>
</div>
</div>
</div>

<div class="bg-white rounded-xl shadow-lg p-8">
<h2 class="text-2xl font-bold mb-6 flex items-center"><i class="fas fa-timeline mr-3 text-blue-600"></i>Parcours Professionnel</h2>
<div id="timeline" class="space-y-8 relative ml-6">
<div class="text-center text-gray-400 py-8"><i class="fas fa-spinner fa-spin text-4xl mb-4"></i><p>Chargement...</p></div>
</div>
</div>
</div>

<div id="experienceModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
<div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
<div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
<h3 id="modalTitle" class="text-xl font-bold">Nouvelle Expérience</h3>
<button onclick="closeModal()" class="text-gray-500 hover:text-gray-700"><i class="fas fa-times text-2xl"></i></button>
</div>
<form id="experienceForm" class="p-6 space-y-4">
<input type="hidden" id="experience_id" />
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
<div><label class="block text-sm font-medium mb-1">Entreprise *</label><input type="text" id="company" required class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:border-transparent" /></div>
<div><label class="block text-sm font-medium mb-1">Poste *</label><input type="text" id="position" required class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:border-transparent" /></div>
</div>
<div><label class="block text-sm font-medium mb-1">Localisation</label><input type="text" id="location" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:border-transparent" /></div>
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
<div><label class="block text-sm font-medium mb-1">Date de début *</label><input type="date" id="start_date" required class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:border-transparent" /></div>
<div><label class="block text-sm font-medium mb-1">Date de fin</label><input type="date" id="end_date" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:border-transparent" /></div>
</div>
<div class="flex items-center"><input type="checkbox" id="is_current" class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-600 border-gray-300 rounded" /><label for="is_current" class="text-sm font-medium">Poste actuel</label></div>
<div><label class="block text-sm font-medium mb-1">Description</label><textarea id="description" rows="3" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:border-transparent"></textarea></div>
<div><label class="block text-sm font-medium mb-1">Réalisations</label><textarea id="achievements" rows="3" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:border-transparent"></textarea></div>
<div><label class="block text-sm font-medium mb-2">Compétences</label><div id="skillsContainer" class="space-y-2"><button type="button" onclick="addSkillField()" class="text-blue-600 hover:text-blue-700 text-sm flex items-center"><i class="fas fa-plus-circle mr-2"></i>Ajouter une compétence</button></div></div>
<div class="flex space-x-3 pt-4">
<button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition"><i class="fas fa-save mr-2"></i>Enregistrer</button>
<button type="button" onclick="closeModal()" class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-lg transition">Annuler</button>
</div>
</form>
</div>
</div>

<script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
<script>
let experiences=[],allSkills=[];
document.addEventListener('DOMContentLoaded',()=>{loadExperiences();loadSkills();});
async function loadExperiences(){try{const r=await axios.get('/api/experiences');experiences=r.data.experiences;renderTimeline();updateStats();}catch(e){console.error(e);document.getElementById('timeline').innerHTML='<p class="text-red-500 text-center">Erreur de chargement</p>';}}
async function loadSkills(){try{const r=await axios.get('/api/skills');allSkills=r.data.skills;}catch(e){console.error(e);}}
function renderTimeline(){const t=document.getElementById('timeline');if(experiences.length===0){t.innerHTML='<div class="text-center text-gray-400 py-8"><i class="fas fa-briefcase text-4xl mb-4"></i><p>Aucune expérience</p><button onclick="showAddExperienceModal()" class="mt-4 text-blue-600 hover:underline">Ajouter votre première expérience</button></div>';return;}t.innerHTML=experiences.map((e,i)=>{const sd=new Date(e.start_date).toLocaleDateString('fr-FR',{month:'long',year:'numeric'});const ed=e.end_date?new Date(e.end_date).toLocaleDateString('fr-FR',{month:'long',year:'numeric'}):'Présent';const dur=calculateDuration(e.start_date,e.end_date);return \`<div class="timeline-item relative pl-8 pb-8 fade-in"><div class="bg-gradient-to-br from-white to-blue-50 rounded-lg shadow-md p-6 hover:shadow-lg transition"><div class="flex justify-between items-start mb-3"><div><h3 class="text-xl font-bold text-gray-800">\${e.position}</h3><p class="text-blue-600 font-semibold">\${e.company}</p></div><div class="flex space-x-2"><button onclick="editExperience(\${e.id})" class="text-blue-600 hover:text-blue-800"><i class="fas fa-edit"></i></button><button onclick="deleteExperience(\${e.id})" class="text-red-600 hover:text-red-800"><i class="fas fa-trash"></i></button></div></div><div class="flex items-center text-sm text-gray-600 mb-3 space-x-4 flex-wrap"><span><i class="far fa-calendar-alt mr-1"></i>\${sd} - \${ed}</span><span><i class="far fa-clock mr-1"></i>\${dur}</span>\${e.location?\`<span><i class="fas fa-map-marker-alt mr-1"></i>\${e.location}</span>\`:''}\${e.is_current?'<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">En cours</span>':''}</div>\${e.description?\`<p class="text-gray-700 mb-3">\${escapeHtml(e.description)}</p>\`:''}\${e.achievements?\`<p class="text-gray-600 text-sm mb-3">\${escapeHtml(e.achievements)}</p>\`:''}\${e.skills&&e.skills.length>0?\`<div class="flex flex-wrap gap-2 mt-3">\${e.skills.map(s=>\`<span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">\${escapeHtml(s.name)}</span>\`).join('')}</div>\`:''}</div></div>\`;}).join('');}
function escapeHtml(t){const m={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'};return t.replace(/[&<>"']/g,m=>m[m]);}
function calculateDuration(sd,ed){const s=new Date(sd);const e=ed?new Date(ed):new Date();const m=(e.getFullYear()-s.getFullYear())*12+e.getMonth()-s.getMonth();const y=Math.floor(m/12);const rm=m%12;if(y>0&&rm>0)return \`\${y} an\${y>1?'s':''} \${rm} mois\`;else if(y>0)return \`\${y} an\${y>1?'s':''}\`;else return \`\${rm} mois\`;}
function updateStats(){document.getElementById('stats-experiences').textContent=experiences.length;const us=new Set();experiences.forEach(e=>e.skills?.forEach(s=>us.add(s.name)));document.getElementById('stats-skills').textContent=us.size;}
function showAddExperienceModal(){document.getElementById('modalTitle').textContent='Nouvelle Expérience';document.getElementById('experienceForm').reset();document.getElementById('experience_id').value='';document.getElementById('skillsContainer').innerHTML='<button type="button" onclick="addSkillField()" class="text-blue-600 hover:text-blue-700 text-sm flex items-center"><i class="fas fa-plus-circle mr-2"></i>Ajouter une compétence</button>';document.getElementById('experienceModal').classList.remove('hidden');}
async function editExperience(id){try{const r=await axios.get(\`/api/experiences/\${id}\`);const e=r.data;document.getElementById('modalTitle').textContent='Modifier l\\'Expérience';document.getElementById('experience_id').value=e.id;document.getElementById('company').value=e.company;document.getElementById('position').value=e.position;document.getElementById('location').value=e.location||'';document.getElementById('start_date').value=e.start_date;document.getElementById('end_date').value=e.end_date||'';document.getElementById('is_current').checked=e.is_current;document.getElementById('description').value=e.description||'';document.getElementById('achievements').value=e.achievements||'';document.getElementById('skillsContainer').innerHTML='<button type="button" onclick="addSkillField()" class="text-blue-600 hover:text-blue-700 text-sm flex items-center"><i class="fas fa-plus-circle mr-2"></i>Ajouter une compétence</button>';e.skills?.forEach(s=>addSkillField(s));document.getElementById('experienceModal').classList.remove('hidden');}catch(e){console.error(e);alert('Erreur de chargement');}}
async function deleteExperience(id){if(!confirm('Supprimer cette expérience ?'))return;try{await axios.delete(\`/api/experiences/\${id}\`);await loadExperiences();}catch(e){console.error(e);alert('Erreur de suppression');}}
function closeModal(){document.getElementById('experienceModal').classList.add('hidden');}
function addSkillField(s=null){const c=document.getElementById('skillsContainer');const d=document.createElement('div');d.className='flex space-x-2 items-center skill-field';d.innerHTML=\`<input type="hidden" name="skill_id[]" value="\${s?.id||''}" /><input type="text" name="skill_name[]" value="\${s?.name||''}" placeholder="Compétence" class="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" list="skills-datalist" /><input type="text" name="skill_category[]" value="\${s?.category||''}" placeholder="Catégorie" class="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" /><button type="button" onclick="this.parentElement.remove()" class="text-red-600 hover:text-red-800"><i class="fas fa-times"></i></button>\`;c.insertBefore(d,c.lastElementChild);if(!document.getElementById('skills-datalist')){const dl=document.createElement('datalist');dl.id='skills-datalist';allSkills.forEach(s=>{const o=document.createElement('option');o.value=s.name;dl.appendChild(o);});document.body.appendChild(dl);}}
document.getElementById('experienceForm').addEventListener('submit',async(e)=>{e.preventDefault();const id=document.getElementById('experience_id').value;const fd={company:document.getElementById('company').value,position:document.getElementById('position').value,location:document.getElementById('location').value,start_date:document.getElementById('start_date').value,end_date:document.getElementById('end_date').value,is_current:document.getElementById('is_current').checked,description:document.getElementById('description').value,achievements:document.getElementById('achievements').value,skills:[]};const si=document.getElementsByName('skill_id[]');const sn=document.getElementsByName('skill_name[]');const sc=document.getElementsByName('skill_category[]');for(let i=0;i<sn.length;i++){if(sn[i].value.trim()){const sd={name:sn[i].value.trim(),category:sc[i].value.trim()||'Other'};if(si[i]&&si[i].value){sd.id=parseInt(si[i].value);}fd.skills.push(sd);}}try{if(id){await axios.put(\`/api/experiences/\${id}\`,fd);}else{await axios.post('/api/experiences',fd);}closeModal();await loadExperiences();await loadSkills();}catch(e){console.error(e);alert('Erreur d\\'enregistrement');}});
async function exportCV(){try{const r=await axios.get('/api/export/markdown',{responseType:'blob'});const u=window.URL.createObjectURL(new Blob([r.data]));const l=document.createElement('a');l.href=u;l.setAttribute('download','cv.md');document.body.appendChild(l);l.click();l.remove();}catch(e){console.error(e);alert('Erreur d\\'export');}}
document.getElementById('is_current').addEventListener('change',(e)=>{const ed=document.getElementById('end_date');if(e.target.checked){ed.value='';ed.disabled=true;}else{ed.disabled=false;}});
</script>
</body>
</html>`
  return c.html(html)
})

export default app
