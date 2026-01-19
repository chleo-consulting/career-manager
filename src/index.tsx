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
      LEFT JOIN experience_skills es ON s.id = es.id
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

    let markdown = '# Curriculum Vitae\n\n'
    markdown += '## Expériences Professionnelles\n\n'

    for (const exp of experiences as any[]) {
      const startDate = new Date(exp.start_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      const endDate = exp.end_date ? new Date(exp.end_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'Présent'
      
      markdown += `### ${exp.position} — ${exp.company}\n`
      markdown += `*${startDate} – ${endDate}*\n`
      if (exp.location) markdown += `📍 ${exp.location}\n`
      markdown += '\n'
      if (exp.description) markdown += `${exp.description}\n\n`
      if (exp.achievements) markdown += `${exp.achievements}\n\n`

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
        markdown += '\n\n'
      }

      markdown += '---\n\n'
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
// MAIN ROUTE - Frontend HTML
// ============================================

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Career Manager - Gestionnaire d'Expériences Professionnelles</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#3b82f6',
                  secondary: '#8b5cf6',
                }
              }
            }
          }
        </script>
        <style>
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .fade-in {
            animation: fadeIn 0.5s ease-out;
          }
          .timeline-item::before {
            content: '';
            position: absolute;
            left: -10px;
            top: 0;
            width: 20px;
            height: 20px;
            background: white;
            border: 4px solid #3b82f6;
            border-radius: 50%;
          }
          .timeline-item::after {
            content: '';
            position: absolute;
            left: 0;
            top: 20px;
            width: 2px;
            height: calc(100% + 20px);
            background: #e5e7eb;
          }
          .timeline-item:last-child::after {
            display: none;
          }
        </style>
    </head>
    <body class="bg-gradient-to-br from-blue-50 to-purple-50 min-h-screen">
        <!-- Navigation -->
        <nav class="bg-white shadow-md sticky top-0 z-50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16 items-center">
                    <div class="flex items-center space-x-3">
                        <i class="fas fa-briefcase text-3xl text-primary"></i>
                        <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Career Manager
                        </h1>
                    </div>
                    <div class="flex space-x-4">
                        <button onclick="showAddExperienceModal()" class="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition flex items-center space-x-2">
                            <i class="fas fa-plus"></i>
                            <span>Nouvelle Expérience</span>
                        </button>
                        <button onclick="exportCV()" class="bg-secondary hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition flex items-center space-x-2">
                            <i class="fas fa-download"></i>
                            <span>Exporter CV</span>
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Main Content -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="bg-white rounded-xl shadow-md p-6 fade-in">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-sm">Expériences</p>
                            <p id="stats-experiences" class="text-3xl font-bold text-primary">0</p>
                        </div>
                        <i class="fas fa-briefcase text-4xl text-blue-200"></i>
                    </div>
                </div>
                <div class="bg-white rounded-xl shadow-md p-6 fade-in" style="animation-delay: 0.1s;">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-sm">Compétences</p>
                            <p id="stats-skills" class="text-3xl font-bold text-secondary">0</p>
                        </div>
                        <i class="fas fa-star text-4xl text-purple-200"></i>
                    </div>
                </div>
                <div class="bg-white rounded-xl shadow-md p-6 fade-in" style="animation-delay: 0.2s;">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-sm">Documents</p>
                            <p id="stats-documents" class="text-3xl font-bold text-green-600">0</p>
                        </div>
                        <i class="fas fa-file-alt text-4xl text-green-200"></i>
                    </div>
                </div>
            </div>

            <!-- Timeline Section -->
            <div class="bg-white rounded-xl shadow-lg p-8">
                <h2 class="text-2xl font-bold mb-6 flex items-center">
                    <i class="fas fa-timeline mr-3 text-primary"></i>
                    Parcours Professionnel
                </h2>
                <div id="timeline" class="space-y-8 relative ml-6">
                    <!-- Timeline items will be inserted here -->
                    <div class="text-center text-gray-400 py-8">
                        <i class="fas fa-spinner fa-spin text-4xl mb-4"></i>
                        <p>Chargement des expériences...</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal for Add/Edit Experience -->
        <div id="experienceModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                    <h3 id="modalTitle" class="text-xl font-bold">Nouvelle Expérience</h3>
                    <button onclick="closeModal()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                <form id="experienceForm" class="p-6 space-y-4">
                    <input type="hidden" id="experience_id" />
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium mb-1">Entreprise *</label>
                            <input type="text" id="company" required class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">Poste *</label>
                            <input type="text" id="position" required class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent" />
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-1">Localisation</label>
                        <input type="text" id="location" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent" />
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium mb-1">Date de début *</label>
                            <input type="date" id="start_date" required class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">Date de fin</label>
                            <input type="date" id="end_date" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent" />
                        </div>
                    </div>

                    <div class="flex items-center">
                        <input type="checkbox" id="is_current" class="mr-2 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" />
                        <label for="is_current" class="text-sm font-medium">Poste actuel</label>
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-1">Description</label>
                        <textarea id="description" rows="3" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"></textarea>
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-1">Réalisations</label>
                        <textarea id="achievements" rows="3" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"></textarea>
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-2">Compétences</label>
                        <div id="skillsContainer" class="space-y-2">
                            <button type="button" onclick="addSkillField()" class="text-primary hover:text-blue-700 text-sm flex items-center">
                                <i class="fas fa-plus-circle mr-2"></i>
                                Ajouter une compétence
                            </button>
                        </div>
                    </div>

                    <div class="flex space-x-3 pt-4">
                        <button type="submit" class="flex-1 bg-primary hover:bg-blue-700 text-white py-2 rounded-lg transition">
                            <i class="fas fa-save mr-2"></i>
                            Enregistrer
                        </button>
                        <button type="button" onclick="closeModal()" class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-lg transition">
                            Annuler
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
          let experiences = [];
          let allSkills = [];

          // Load data on page load
          document.addEventListener('DOMContentLoaded', () => {
            loadExperiences();
            loadSkills();
          });

          async function loadExperiences() {
            try {
              const response = await axios.get('/api/experiences');
              experiences = response.data.experiences;
              renderTimeline();
              updateStats();
            } catch (error) {
              console.error('Error loading experiences:', error);
              document.getElementById('timeline').innerHTML = '<p class="text-red-500 text-center">Erreur lors du chargement des expériences</p>';
            }
          }

          async function loadSkills() {
            try {
              const response = await axios.get('/api/skills');
              allSkills = response.data.skills;
            } catch (error) {
              console.error('Error loading skills:', error);
            }
          }

          function renderTimeline() {
            const timeline = document.getElementById('timeline');
            
            if (experiences.length === 0) {
              timeline.innerHTML = `
                <div class="text-center text-gray-400 py-8">
                  <i class="fas fa-briefcase text-4xl mb-4"></i>
                  <p>Aucune expérience enregistrée</p>
                  <button onclick="showAddExperienceModal()" class="mt-4 text-primary hover:underline">
                    Ajouter votre première expérience
                  </button>
                </div>
              `;
              return;
            }

            timeline.innerHTML = experiences.map((exp, index) => {
              const startDate = new Date(exp.start_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
              const endDate = exp.end_date ? new Date(exp.end_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'Présent';
              const duration = calculateDuration(exp.start_date, exp.end_date);
              
              return \`
                <div class="timeline-item relative pl-8 pb-8 fade-in" style="animation-delay: \${index * 0.1}s;">
                  <div class="bg-gradient-to-br from-white to-blue-50 rounded-lg shadow-md p-6 hover:shadow-lg transition">
                    <div class="flex justify-between items-start mb-3">
                      <div>
                        <h3 class="text-xl font-bold text-gray-800">\${exp.position}</h3>
                        <p class="text-primary font-semibold">\${exp.company}</p>
                      </div>
                      <div class="flex space-x-2">
                        <button onclick="editExperience(\${exp.id})" class="text-blue-600 hover:text-blue-800">
                          <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteExperience(\${exp.id})" class="text-red-600 hover:text-red-800">
                          <i class="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                    
                    <div class="flex items-center text-sm text-gray-600 mb-3 space-x-4">
                      <span><i class="far fa-calendar-alt mr-1"></i>\${startDate} - \${endDate}</span>
                      <span><i class="far fa-clock mr-1"></i>\${duration}</span>
                      \${exp.location ? \`<span><i class="fas fa-map-marker-alt mr-1"></i>\${exp.location}</span>\` : ''}
                      \${exp.is_current ? '<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">En cours</span>' : ''}
                    </div>
                    
                    \${exp.description ? \`<p class="text-gray-700 mb-3">\${exp.description}</p>\` : ''}
                    \${exp.achievements ? \`<p class="text-gray-600 text-sm mb-3">\${exp.achievements}</p>\` : ''}
                    
                    \${exp.skills && exp.skills.length > 0 ? \`
                      <div class="flex flex-wrap gap-2 mt-3">
                        \${exp.skills.map(s => \`
                          <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                            \${s.name}
                          </span>
                        \`).join('')}
                      </div>
                    \` : ''}
                  </div>
                </div>
              \`;
            }).join('');
          }

          function calculateDuration(startDate, endDate) {
            const start = new Date(startDate);
            const end = endDate ? new Date(endDate) : new Date();
            const months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
            const years = Math.floor(months / 12);
            const remainingMonths = months % 12;
            
            if (years > 0 && remainingMonths > 0) {
              return \`\${years} an\${years > 1 ? 's' : ''} \${remainingMonths} mois\`;
            } else if (years > 0) {
              return \`\${years} an\${years > 1 ? 's' : ''}\`;
            } else {
              return \`\${remainingMonths} mois\`;
            }
          }

          function updateStats() {
            document.getElementById('stats-experiences').textContent = experiences.length;
            const uniqueSkills = new Set();
            experiences.forEach(exp => {
              exp.skills?.forEach(s => uniqueSkills.add(s.name));
            });
            document.getElementById('stats-skills').textContent = uniqueSkills.size;
          }

          function showAddExperienceModal() {
            document.getElementById('modalTitle').textContent = 'Nouvelle Expérience';
            document.getElementById('experienceForm').reset();
            document.getElementById('experience_id').value = '';
            document.getElementById('skillsContainer').innerHTML = '<button type="button" onclick="addSkillField()" class="text-primary hover:text-blue-700 text-sm flex items-center"><i class="fas fa-plus-circle mr-2"></i>Ajouter une compétence</button>';
            document.getElementById('experienceModal').classList.remove('hidden');
          }

          async function editExperience(id) {
            try {
              const response = await axios.get(\`/api/experiences/\${id}\`);
              const exp = response.data;
              
              document.getElementById('modalTitle').textContent = 'Modifier l\'Expérience';
              document.getElementById('experience_id').value = exp.id;
              document.getElementById('company').value = exp.company;
              document.getElementById('position').value = exp.position;
              document.getElementById('location').value = exp.location || '';
              document.getElementById('start_date').value = exp.start_date;
              document.getElementById('end_date').value = exp.end_date || '';
              document.getElementById('is_current').checked = exp.is_current;
              document.getElementById('description').value = exp.description || '';
              document.getElementById('achievements').value = exp.achievements || '';
              
              // Load skills
              document.getElementById('skillsContainer').innerHTML = '<button type="button" onclick="addSkillField()" class="text-primary hover:text-blue-700 text-sm flex items-center"><i class="fas fa-plus-circle mr-2"></i>Ajouter une compétence</button>';
              exp.skills?.forEach(skill => {
                addSkillField(skill);
              });
              
              document.getElementById('experienceModal').classList.remove('hidden');
            } catch (error) {
              console.error('Error loading experience:', error);
              alert('Erreur lors du chargement de l\'expérience');
            }
          }

          async function deleteExperience(id) {
            if (!confirm('Êtes-vous sûr de vouloir supprimer cette expérience ?')) return;
            
            try {
              await axios.delete(\`/api/experiences/\${id}\`);
              await loadExperiences();
            } catch (error) {
              console.error('Error deleting experience:', error);
              alert('Erreur lors de la suppression');
            }
          }

          function closeModal() {
            document.getElementById('experienceModal').classList.add('hidden');
          }

          let skillCounter = 0;
          function addSkillField(skill = null) {
            const container = document.getElementById('skillsContainer');
            const skillDiv = document.createElement('div');
            skillDiv.className = 'flex space-x-2 items-center skill-field';
            skillDiv.innerHTML = \`
              <input type="text" name="skill_name[]" value="\${skill?.name || ''}" placeholder="Nom de la compétence" class="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" list="skills-datalist" />
              <input type="text" name="skill_category[]" value="\${skill?.category || ''}" placeholder="Catégorie" class="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" />
              <button type="button" onclick="this.parentElement.remove()" class="text-red-600 hover:text-red-800">
                <i class="fas fa-times"></i>
              </button>
            \`;
            container.insertBefore(skillDiv, container.lastElementChild);
            
            // Add datalist for autocomplete if not exists
            if (!document.getElementById('skills-datalist')) {
              const datalist = document.createElement('datalist');
              datalist.id = 'skills-datalist';
              allSkills.forEach(s => {
                const option = document.createElement('option');
                option.value = s.name;
                datalist.appendChild(option);
              });
              document.body.appendChild(datalist);
            }
          }

          document.getElementById('experienceForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const id = document.getElementById('experience_id').value;
            const formData = {
              company: document.getElementById('company').value,
              position: document.getElementById('position').value,
              location: document.getElementById('location').value,
              start_date: document.getElementById('start_date').value,
              end_date: document.getElementById('end_date').value,
              is_current: document.getElementById('is_current').checked,
              description: document.getElementById('description').value,
              achievements: document.getElementById('achievements').value,
              skills: []
            };

            // Collect skills
            const skillNames = document.getElementsByName('skill_name[]');
            const skillCategories = document.getElementsByName('skill_category[]');
            for (let i = 0; i < skillNames.length; i++) {
              if (skillNames[i].value.trim()) {
                formData.skills.push({
                  name: skillNames[i].value.trim(),
                  category: skillCategories[i].value.trim() || 'Other'
                });
              }
            }

            try {
              if (id) {
                await axios.put(\`/api/experiences/\${id}\`, formData);
              } else {
                await axios.post('/api/experiences', formData);
              }
              closeModal();
              await loadExperiences();
              await loadSkills();
            } catch (error) {
              console.error('Error saving experience:', error);
              alert('Erreur lors de l\'enregistrement');
            }
          });

          async function exportCV() {
            try {
              const response = await axios.get('/api/export/markdown', {
                responseType: 'blob'
              });
              const url = window.URL.createObjectURL(new Blob([response.data]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', 'cv.md');
              document.body.appendChild(link);
              link.click();
              link.remove();
            } catch (error) {
              console.error('Error exporting CV:', error);
              alert('Erreur lors de l\'export');
            }
          }

          // Auto-disable end_date when is_current is checked
          document.getElementById('is_current').addEventListener('change', (e) => {
            const endDateInput = document.getElementById('end_date');
            if (e.target.checked) {
              endDateInput.value = '';
              endDateInput.disabled = true;
            } else {
              endDateInput.disabled = false;
            }
          });
        </script>
    </body>
    </html>
  `)
})

export default app
