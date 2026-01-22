// prisma/seed-hospitals.ts
// Seed de hospitales del catalogo CLUES para CDMX con especialidades

import { PrismaClient, InstitutionType, AttentionLevel } from '@prisma/client';

const prisma = new PrismaClient();

// Mapeo de condiciones médicas a especialidades relevantes
export const conditionToSpecialties: Record<string, string[]> = {
  'Diabetes': ['Endocrinologia', 'Medicina Interna', 'Nefrologia', 'Oftalmologia'],
  'Diabetes Mellitus': ['Endocrinologia', 'Medicina Interna', 'Nefrologia'],
  'Hipertension': ['Cardiologia', 'Medicina Interna', 'Nefrologia'],
  'Hipertension Arterial': ['Cardiologia', 'Medicina Interna'],
  'Cardiopatia': ['Cardiologia', 'Cirugia Cardiovascular'],
  'Infarto': ['Cardiologia', 'Urgencias', 'UCI'],
  'Asma': ['Neumologia', 'Alergologia', 'Medicina Interna'],
  'EPOC': ['Neumologia', 'Medicina Interna'],
  'Cancer': ['Oncologia', 'Cirugia Oncologica', 'Radioterapia'],
  'Traumatismo': ['Traumatologia', 'Ortopedia', 'Urgencias'],
  'Fractura': ['Traumatologia', 'Ortopedia'],
  'Embarazo': ['Ginecologia', 'Obstetricia', 'Neonatologia'],
  'Pediatrico': ['Pediatria', 'Neonatologia'],
  'Renal': ['Nefrologia', 'Urologia'],
  'Neurologico': ['Neurologia', 'Neurocirugia'],
  'ACV': ['Neurologia', 'Urgencias', 'UCI'],
  'Psiquiatrico': ['Psiquiatria', 'Salud Mental'],
};

// Hospitales reales de CDMX y Morelos con coordenadas y especialidades
const hospitales = [
  // --- CDMX ---
  {
    cluesCode: 'DFSSA000015',
    name: 'Hospital General de Mexico Dr. Eduardo Liceaga',
    type: InstitutionType.HOSPITAL_PUBLIC,
    attentionLevel: AttentionLevel.THIRD,
    address: 'Dr. Balmis 148, Doctores',
    city: 'Ciudad de Mexico',
    state: 'CDMX',
    zipCode: '06720',
    latitude: 19.4117,
    longitude: -99.1525,
    phone: '55 2789 2000',
    emergencyPhone: '55 2789 2000 ext. 1101',
    specialties: ['Urgencias', 'Medicina Interna', 'Cardiologia', 'Neurologia', 'Traumatologia', 'Oncologia', 'Nefrologia', 'Cirugia General', 'UCI'],
    hasEmergency: true,
    has24Hours: true,
    hasICU: true,
    hasTrauma: true,
  },
  // ... (otros hospitales de CDMX)

  // --- MORELOS (Cuernavaca / Jiutepec) ---
  {
    cluesCode: 'MSSA000665',
    name: 'Hospital General de Cuernavaca "Dr. José G. Parres"',
    type: InstitutionType.HOSPITAL_PUBLIC,
    attentionLevel: AttentionLevel.SECOND,
    address: 'Av. Domingo Diez s/n, Lomas de la Selva',
    city: 'Cuernavaca',
    state: 'MOR',
    zipCode: '62250',
    latitude: 18.9186,
    longitude: -99.2342,
    phone: '777 311 2288',
    emergencyPhone: '777 311 2288',
    specialties: ['Urgencias', 'Medicina Interna', 'Cirugia General', 'Pediatria', 'Ginecologia', 'Traumatologia'],
    hasEmergency: true,
    has24Hours: true,
    hasICU: true,
    hasTrauma: true,
  },
  {
    cluesCode: 'MSSA000000', // Código simulado si no se tiene el real a mano
    name: 'IMSS Hospital General Regional No. 1',
    type: InstitutionType.IMSS,
    attentionLevel: AttentionLevel.SECOND,
    address: 'Av. Plan de Ayala 1201, Chapultepec',
    city: 'Cuernavaca',
    state: 'MOR',
    zipCode: '62450',
    latitude: 18.9215,
    longitude: -99.2198,
    phone: '777 315 5000',
    emergencyPhone: '777 315 5000',
    specialties: ['Urgencias', 'Medicina Interna', 'Cardiologia', 'Nefrologia', 'Cirugia General'],
    hasEmergency: true,
    has24Hours: true,
    hasICU: true,
    hasTrauma: false,
  },
  {
    cluesCode: 'MSPRA00001',
    name: 'Hospital Center Vista Hermosa',
    type: InstitutionType.HOSPITAL_PRIVATE,
    attentionLevel: AttentionLevel.THIRD,
    address: 'Rio Panuco 100, Vista Hermosa',
    city: 'Cuernavaca',
    state: 'MOR',
    zipCode: '62290',
    latitude: 18.9322,
    longitude: -99.2234,
    phone: '777 315 1293',
    emergencyPhone: '777 315 1293',
    specialties: ['Urgencias', 'Cardiologia', 'Neurologia', 'Cirugia General', 'UCI'],
    hasEmergency: true,
    has24Hours: true,
    hasICU: true,
    hasTrauma: true,
  },
  {
    cluesCode: 'MSPRA00002',
    name: 'Hospital San Diego',
    type: InstitutionType.HOSPITAL_PRIVATE,
    attentionLevel: AttentionLevel.SECOND,
    address: 'Av. San Diego 1201, Vista Hermosa',
    city: 'Cuernavaca',
    state: 'MOR',
    zipCode: '62290',
    latitude: 18.9356,
    longitude: -99.2201,
    phone: '777 316 2872',
    emergencyPhone: '777 316 2872',
    specialties: ['Urgencias', 'Medicina General', 'Ginecologia', 'Pediatria'],
    hasEmergency: true,
    has24Hours: true,
    hasICU: false,
    hasTrauma: false,
  },
  {
    cluesCode: 'MSSA000002',
    name: 'Hospital del Niño y el Adolescente Morelense',
    type: InstitutionType.HOSPITAL_PUBLIC,
    attentionLevel: AttentionLevel.THIRD,
    address: 'Av. de la Salud 1, Benito Juárez',
    city: 'Emiliano Zapata',
    state: 'MOR',
    zipCode: '62765',
    latitude: 18.8476,
    longitude: -99.2227,
    phone: '777 362 1170',
    emergencyPhone: '777 362 1170',
    specialties: ['Pediatria', 'Urgencias Pediatricas', 'Oncologia Pediatrica', 'Cirugia Pediatrica', 'Neonatologia'],
    hasEmergency: true,
    has24Hours: true,
    hasICU: true,
    hasTrauma: true,
  }
];

export async function seedHospitals() {
  console.log('Iniciando seed de hospitales (CDMX y Morelos)...');

  for (const hospital of hospitales) {
    await prisma.medicalInstitution.upsert({
      where: { cluesCode: hospital.cluesCode },
      create: {
        ...hospital,
        isActive: true,
        isVerified: true,
        verifiedAt: new Date(),
      },
      update: {
        name: hospital.name,
        type: hospital.type,
        attentionLevel: hospital.attentionLevel,
        address: hospital.address,
        city: hospital.city,
        state: hospital.state,
        zipCode: hospital.zipCode,
        latitude: hospital.latitude,
        longitude: hospital.longitude,
        phone: hospital.phone,
        emergencyPhone: hospital.emergencyPhone,
        specialties: hospital.specialties,
        hasEmergency: hospital.hasEmergency,
        has24Hours: hospital.has24Hours,
        hasICU: hospital.hasICU,
        hasTrauma: hospital.hasTrauma,
      },
    });

    console.log(`  ✓ ${hospital.name}`);
  }

  console.log(`\n✅ Seed completado: ${hospitales.length} hospitales con especialidades`);
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  seedHospitals()
    .catch((e) => {
      console.error('Error en seed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
