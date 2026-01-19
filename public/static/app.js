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
    
    return `
      <div class="timeline-item relative pl-8 pb-8 fade-in" style="animation-delay: ${index * 0.1}s;">
        <div class="bg-gradient-to-br from-white to-blue-50 rounded-lg shadow-md p-6 hover:shadow-lg transition">
          <div class="flex justify-between items-start mb-3">
            <div>
              <h3 class="text-xl font-bold text-gray-800">${exp.position}</h3>
              <p class="text-primary font-semibold">${exp.company}</p>
            </div>
            <div class="flex space-x-2">
              <button onclick="editExperience(${exp.id})" class="text-blue-600 hover:text-blue-800">
                <i class="fas fa-edit"></i>
              </button>
              <button onclick="deleteExperience(${exp.id})" class="text-red-600 hover:text-red-800">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          
          <div class="flex items-center text-sm text-gray-600 mb-3 space-x-4 flex-wrap">
            <span><i class="far fa-calendar-alt mr-1"></i>${startDate} - ${endDate}</span>
            <span><i class="far fa-clock mr-1"></i>${duration}</span>
            ${exp.location ? `<span><i class="fas fa-map-marker-alt mr-1"></i>${exp.location}</span>` : ''}
            ${exp.is_current ? '<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">En cours</span>' : ''}
          </div>
          
          ${exp.description ? `<p class="text-gray-700 mb-3">${escapeHtml(exp.description)}</p>` : ''}
          ${exp.achievements ? `<p class="text-gray-600 text-sm mb-3">${escapeHtml(exp.achievements)}</p>` : ''}
          
          ${exp.skills && exp.skills.length > 0 ? `
            <div class="flex flex-wrap gap-2 mt-3">
              ${exp.skills.map(s => `
                <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                  ${escapeHtml(s.name)}
                </span>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function calculateDuration(startDate, endDate) {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  const months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  if (years > 0 && remainingMonths > 0) {
    return `${years} an${years > 1 ? 's' : ''} ${remainingMonths} mois`;
  } else if (years > 0) {
    return `${years} an${years > 1 ? 's' : ''}`;
  } else {
    return `${remainingMonths} mois`;
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
    const response = await axios.get(`/api/experiences/${id}`);
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
    await axios.delete(`/api/experiences/${id}`);
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
  skillDiv.innerHTML = `
    <input type="text" name="skill_name[]" value="${skill?.name || ''}" placeholder="Nom de la compétence" class="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" list="skills-datalist" />
    <input type="text" name="skill_category[]" value="${skill?.category || ''}" placeholder="Catégorie" class="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" />
    <button type="button" onclick="this.parentElement.remove()" class="text-red-600 hover:text-red-800">
      <i class="fas fa-times"></i>
    </button>
  `;
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
      await axios.put(`/api/experiences/${id}`, formData);
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
