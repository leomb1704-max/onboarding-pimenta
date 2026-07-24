const GHL_API_KEY = 'pit-fded271c-8ced-4512-8937-996080e7e983';
const GHL_LOCATION_ID = 'dtz4paUuHKyFF70FM0Jo';
const GHL_PIPELINE_NAME = 'Clientes Linkedin Rockstars';
const GHL_STAGE_NAME = 'Raio X Recebido';

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    const nameParts = (data.nome || '').trim().split(' ');
    const firstName = nameParts[0] || 'Sem nome';
    const lastName = nameParts.slice(1).join(' ') || '';

    const rawPhone = (data.whatsapp || '').replace(/\D/g, '');
    const phone = rawPhone.startsWith('55') ? '+' + rawPhone : '+55' + rawPhone;

    // 1. Criar contato
    const contactRes = await fetch('https://services.leadconnectorhq.com/contacts/', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + GHL_API_KEY,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify({
        locationId: GHL_LOCATION_ID,
        firstName, lastName,
        email: data.email || '',
        phone,
        city: data.cidade || ''
      })
    });

    const contactJson = await contactRes.json();
    const contactId = contactJson?.contact?.id;

    if (!contactId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Contato não criado', detail: contactJson }) };
    }

    // 2. Adicionar nota
    await fetch('https://services.leadconnectorhq.com/contacts/' + contactId + '/notes', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + GHL_API_KEY,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify({ body: buildNotes(data) })
    });

    // 3. Buscar pipeline e estágio correto
    const pipRes = await fetch('https://services.leadconnectorhq.com/opportunities/pipelines?locationId=' + GHL_LOCATION_ID, {
      headers: { 'Authorization': 'Bearer ' + GHL_API_KEY, 'Version': '2021-07-28' }
    });
    const pipJson = await pipRes.json();
    const pipeline = (pipJson.pipelines || []).find(p => p.name === GHL_PIPELINE_NAME);

    // 4. Criar oportunidade no estágio correto
    if (pipeline) {
      const stage = (pipeline.stages || []).find(s => s.name === GHL_STAGE_NAME) || pipeline.stages?.[0];
      const stageId = stage?.id;

      await fetch('https://services.leadconnectorhq.com/opportunities/', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + GHL_API_KEY,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        },
        body: JSON.stringify({
          pipelineId: pipeline.id,
          locationId: GHL_LOCATION_ID,
          name: data.nome + ' – Onboarding',
          pipelineStageId: stageId,
          status: 'open',
          contactId
        })
      });
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, contactId }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

function buildNotes(d) {
  return [
    '=== RAIO-X ONBOARDING ===',
    '', '--- DADOS PESSOAIS ---',
    'Instagram: ' + d.instagram,
    'LinkedIn: ' + d.linkedin,
    'WhatsApp: ' + d.whatsapp,
    'E-mail: ' + d.email,
    'Nascimento: ' + d.nascimento,
    'Cidade: ' + d.cidade,
    '', '--- SOBRE A MENTORIA ---',
    'Como chegou: ' + d.como_chegou,
    'Perfil: ' + d.perfil,
    'Ponto decisivo: ' + d.ponto_decisivo,
    '', '--- SEU NEGÓCIO ---',
    'Nicho/sub-nicho: ' + d.nicho,
    'Produtos/serviços: ' + d.produtos,
    'ICP: ' + d.icp,
    'Problema do público: ' + d.problema_publico,
    'Diferencial: ' + d.diferencial,
    'Resultados prometidos: ' + d.resultados_prometidos,
    'Cases: ' + d.cases,
    'Posicionamento: ' + d.posicionamento,
    'Nível de consciência: ' + d.nivel_consciencia,
    'Concorrentes: ' + d.concorrentes,
    '', '--- FINANCEIRO ---',
    'Faturamento mensal: ' + d.faturamento,
    'Cenário: ' + d.cenario,
    '', '--- VENDAS ---',
    'Dificuldade: ' + d.dificuldade,
    'Equipe comercial: ' + d.equipe_comercial,
    'Reuniões/mês atual: ' + d.reunioes_atuais,
    'Reuniões/mês meta: ' + d.reunioes_meta,
    '', '--- MARKETING ---',
    'Funis: ' + d.funis,
    'Invest. marketing: ' + d.investimento_mkt,
    'Invest. tráfego pago: ' + d.investimento_trafego,
    'CPL: ' + d.custo_lead,
    'CAC/CPA: ' + d.custo_venda,
    '', '--- ESTRUTURA ---',
    'Base clientes: ' + d.base_clientes,
    'Base leads: ' + d.base_leads,
    'CRM: ' + d.crm,
    'Equipe total: ' + d.equipe_total,
    '', '--- OBJETIVOS ---',
    'Objetivo 6 meses: ' + d.objetivo_6meses,
    'Principal desafio: ' + d.principal_desafio
  ].join('\n');
}
