import { Request, Response } from 'express';
import { CROP_DISEASES, CLASS_LABELS, SEVERITY_RULES } from '../lib/constants';

// Build a detailed disease info map
const DISEASE_DETAILS: Record<string, {
  id: string;
  name: string;
  crop: string;
  classLabel: string;
  isCritical: boolean;
  description: string;
}> = {};

CLASS_LABELS.forEach((label, index) => {
  const [crop, ...diseaseParts] = label.split('___');
  const diseaseName = diseaseParts.join(' ').replace(/_/g, ' ');
  const id = label.toLowerCase().replace(/[^a-z0-9]/g, '-');

  const isCritical = SEVERITY_RULES.criticalDiseases.some(d =>
    label.toLowerCase().includes(d.toLowerCase())
  );

  DISEASE_DETAILS[id] = {
    id,
    name: diseaseName || 'Healthy',
    crop: crop.toLowerCase(),
    classLabel: label,
    isCritical,
    description: `${diseaseName || 'Healthy'} condition in ${crop} crops.`,
  };
});

export function diseasesController(req: Request, res: Response) {
  const { crop } = req.query;

  let diseases = Object.values(DISEASE_DETAILS);

  // Filter by crop if query param provided
  if (crop && typeof crop === 'string') {
    diseases = diseases.filter(d => d.crop === crop.toLowerCase());
  }

  res.status(200).json({
    success: true,
    diseases,
    total: diseases.length,
  });
}

export function diseaseByIdController(req: Request, res: Response) {
  const { id } = req.params;

  const disease = DISEASE_DETAILS[id];

  if (!disease) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'DISEASE_NOT_FOUND',
        message: `Disease with id '${id}' not found.`,
      },
    });
  }

  // Find related crop info
  const cropInfo = CROP_DISEASES.find(c => c.id === disease.crop);

  return res.status(200).json({
    success: true,
    disease: {
      ...disease,
      cropInfo,
    },
  });
}
