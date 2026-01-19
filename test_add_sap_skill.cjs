/**
 * Test Unitaire Automatisé - Ajout Compétence SAP
 * 
 * Ce test valide que l'ajout d'une compétence existante à une expérience
 * réutilise correctement la compétence sans créer de doublon.
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000';
const EXPERIENCE_ID = 3;  // ID de l'expérience "tefdf"
const SKILL_ID = 1;        // ID de la compétence "SAP"
const SKILL_NAME = 'SAP';

// Couleurs pour output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runTest() {
  console.log('========================================');
  console.log('🧪 TEST UNITAIRE - Ajout Compétence SAP');
  console.log('========================================\n');

  try {
    // ÉTAPE 1 : Récupérer l'état initial
    log('📋 ÉTAPE 1 : Récupération de l\'expérience initiale', 'yellow');
    const initialResponse = await axios.get(`${API_URL}/api/experiences/${EXPERIENCE_ID}`);
    const initialData = initialResponse.data;
    
    console.log('État initial :');
    console.log(`  Position: ${initialData.position}`);
    console.log(`  Compétences: ${initialData.skills.length}`);
    initialData.skills.forEach(s => console.log(`    - ${s.name} (ID: ${s.id})`));
    console.log();

    // ÉTAPE 2 : Vérifier que SAP existe
    log('🔍 ÉTAPE 2 : Vérification que SAP existe dans la base', 'yellow');
    const skillsResponse = await axios.get(`${API_URL}/api/skills`);
    const sapSkill = skillsResponse.data.skills.find(s => s.id === SKILL_ID && s.name === SKILL_NAME);
    
    if (!sapSkill) {
      log('❌ ÉCHEC : SAP n\'existe pas dans la base', 'red');
      process.exit(1);
    }
    log(`✅ SAP existe avec l'ID ${SKILL_ID}`, 'green');
    console.log();

    // ÉTAPE 3 : Compter les SAP avant
    log('📊 ÉTAPE 3 : Comptage des SAP dans la base', 'yellow');
    const sapCountBefore = skillsResponse.data.skills.filter(s => s.name === SKILL_NAME).length;
    console.log(`  Nombre de compétences SAP AVANT : ${sapCountBefore}`);
    console.log();

    // ÉTAPE 4 : Préparer la mise à jour
    log('✏️  ÉTAPE 4 : Préparation de la mise à jour', 'yellow');
    
    // Vérifier si SAP est déjà présent
    const hasSapBefore = initialData.skills.some(s => s.id === SKILL_ID);
    if (hasSapBefore) {
      log('⚠️  SAP est déjà associé à cette expérience, test non applicable', 'yellow');
      return;
    }

    // Construire le payload avec SAP ajouté
    const updatePayload = {
      company: initialData.company,
      position: initialData.position,
      location: initialData.location,
      start_date: initialData.start_date,
      end_date: initialData.end_date,
      is_current: initialData.is_current,
      description: initialData.description,
      achievements: initialData.achievements,
      skills: [
        ...initialData.skills.map(s => ({
          id: s.id,
          name: s.name,
          category: s.category
        })),
        {
          id: SKILL_ID,
          name: SKILL_NAME,
          category: 'ERP & Data Platforms'
        }
      ]
    };

    console.log('  Compétences à enregistrer :');
    updatePayload.skills.forEach(s => console.log(`    - ${s.name} (ID: ${s.id})`));
    console.log();

    // ÉTAPE 5 : Effectuer la mise à jour
    log('🚀 ÉTAPE 5 : Envoi de la mise à jour', 'yellow');
    const updateResponse = await axios.put(
      `${API_URL}/api/experiences/${EXPERIENCE_ID}`,
      updatePayload
    );
    
    if (updateResponse.data.message.includes('successfully')) {
      log('✅ Mise à jour effectuée avec succès', 'green');
    } else {
      log('❌ ÉCHEC : Mise à jour non effectuée', 'red');
      process.exit(1);
    }
    console.log();

    // ÉTAPE 6 : Vérifier l'association
    log('🔎 ÉTAPE 6 : Vérification de l\'association', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 500)); // Attendre la DB
    
    const updatedResponse = await axios.get(`${API_URL}/api/experiences/${EXPERIENCE_ID}`);
    const updatedData = updatedResponse.data;
    
    const hasSap = updatedData.skills.some(s => s.id === SKILL_ID && s.name === SKILL_NAME);
    
    if (hasSap) {
      log('✅ SAP est bien associé à l\'expérience', 'green');
    } else {
      log('❌ ÉCHEC : SAP n\'est pas associé', 'red');
      process.exit(1);
    }

    console.log('Compétences après mise à jour :');
    updatedData.skills.forEach(s => console.log(`  - ${s.name} (ID: ${s.id})`));
    console.log();

    // ÉTAPE 7 : Vérifier l'absence de duplication
    log('🔍 ÉTAPE 7 : Vérification de l\'absence de duplication', 'yellow');
    const skillsAfter = await axios.get(`${API_URL}/api/skills`);
    const sapCountAfter = skillsAfter.data.skills.filter(s => s.name === SKILL_NAME).length;
    
    console.log(`  Nombre de compétences SAP APRÈS : ${sapCountAfter}`);
    
    if (sapCountBefore === sapCountAfter) {
      log(`✅ Aucune duplication (${sapCountBefore} → ${sapCountAfter})`, 'green');
    } else {
      log(`❌ ÉCHEC : Duplication détectée (${sapCountBefore} → ${sapCountAfter})`, 'red');
      process.exit(1);
    }
    console.log();

    // ÉTAPE 8 : Vérifier l'ID
    log('🆔 ÉTAPE 8 : Vérification de l\'ID', 'yellow');
    const sapInExperience = updatedData.skills.find(s => s.name === SKILL_NAME);
    
    if (sapInExperience && sapInExperience.id === SKILL_ID) {
      log(`✅ L'ID de SAP est correct : ${SKILL_ID}`, 'green');
    } else {
      log(`❌ ÉCHEC : L'ID est incorrect (attendu: ${SKILL_ID}, obtenu: ${sapInExperience?.id})`, 'red');
      process.exit(1);
    }
    console.log();

    // RÉSULTAT FINAL
    console.log('========================================');
    log('✅ TEST RÉUSSI !', 'green');
    console.log('========================================\n');
    
    console.log('Résumé des vérifications :');
    console.log('  ✅ La compétence SAP existante a été ajoutée');
    console.log('  ✅ Aucune duplication n\'a été créée');
    console.log('  ✅ L\'ID de la compétence est correct');
    console.log('  ✅ L\'association est enregistrée dans la base\n');
    console.log('🎉 Le bug de mapping est bien corrigé !');

  } catch (error) {
    console.error('\n❌ ERREUR DURANT LE TEST :', error.message);
    if (error.response) {
      console.error('Réponse API :', error.response.data);
    }
    process.exit(1);
  }
}

// Vérifier que axios est installé
try {
  require.resolve('axios');
} catch (e) {
  console.error('❌ axios n\'est pas installé. Exécutez : npm install axios');
  process.exit(1);
}

// Exécuter le test
runTest();
