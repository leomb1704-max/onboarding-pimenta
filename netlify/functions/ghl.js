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
    console.log('=== INICIO ONBOARDING ===');
    console.log('Nome:', data.nome);
    console.log('Email:', data.email);
    console.log('WhatsApp raw:', data.whatsapp);

    const nameParts = (data.nome || '').trim().split(' ');
    const firstName = nameParts[0] || 'Sem nome';
    const lastName = nameParts.slice(1).join(' ') || '';
    const rawPhone = (data.whatsapp || '').replace(/\D/g, '');
    const phone = rawPhone.startsWith('55') ? '+' + rawPhone : '+55' + rawPhone;
    console.log('Phone formatado:', phone);

    // 1. Criar contato
    console.log('Criando contato...');
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
    console.log('Resposta contato status:', contactRes.status);
    console.log('Resposta contato:', JSON.stringify(contactJson));
    
    const contactId = contactJson?.contact?.id;
    if (!contactId) {
      console.log('ERRO: Contato não criado');
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Contato não criado', detail: contactJson }) };
    }
    console.log('Contato criado! ID:', contactId);

    // 2. Nota
    console.log('Adicionando nota...');
    const noteRes = await fetch('https://services.leadconnectorhq.com/contacts/' + contactId + '/notes', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + GHL_API_KEY,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify({ body: buildNotes(data) })
    });
    console.log('Nota status:', noteRes.status);

    // 3. Pipelines
    console.log('Buscando pipelines...');
    const pipRes = await fetch('https://services.leadconnectorhq.com/opportunities/pipelines?locationId=' + GHL_LOCATION_ID, {
      headers: { 'Authorization': 'Bearer ' + GHL_API_KEY, 'Version': '2021-07-28' }
    });
    const pipJson = await pipRes.json();
    console.log('Pipelines encontrados:', (pipJson.pipelines || []).map(p => p.name).join(', '));

    const pipeline = (pipJson.pipelines || []).find(p => p.name === GHL_PIPELINE_NAME);
    if (!pipeline) {
      console.log('ERRO: Pipeline não encontrado:', GHL_PIPELINE_NAME);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, contactId, warning: 'Pipeline não encontrado' }) };
    }
    console.log('Pipeline encontrado:', pipeline.name, '| ID:', pipeline.id);
    console.log('Estágios:', (pipeline.stages || []).map(s => s.name).join(', '));

    const stage = (pipeline.stages || []).find(s => s.name === GHL_STAGE_NAME) || pipeline.stages?.[0];
    console.log('Estágio escolhido:', stage?.name, '| ID:', stage?.id);

    // 4. Oportunidade
    console.log('Criando oportunidade...');
    const oppRes = await fetch('https://services.leadconnectorhq.com/opportunities/', {
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
        pipelineStageId: stage?.id,
        status: 'open',
        contactId
      })
    });
    const oppJson = await oppRes.json();
    console.log('Oportunidade status:', oppRes.status);
    console.log('Oportunidade resposta:', JSON.stringify(oppJson));

    console.log('=== SUCESSO ===');
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, contactId }) };

  } catch (err) {
    console.log('ERRO GERAL:', err.message);
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
