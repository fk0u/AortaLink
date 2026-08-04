import 'dart:convert';

/// HL7 FHIR Version R4 Observation Model for Flutter Mobile App
class FhirObservationModel {
  final String resourceType;
  final String id;
  final String status;
  final String categoryCode;
  final String code;
  final String display;
  final String effectiveDateTime;
  final double? systolic;
  final double? diastolic;
  final double? pulse;
  final String? measurementContext;

  FhirObservationModel({
    this.resourceType = 'Observation',
    required this.id,
    this.status = 'final',
    this.categoryCode = 'vital-signs',
    required this.code,
    required this.display,
    required this.effectiveDateTime,
    this.systolic,
    this.diastolic,
    this.pulse,
    this.measurementContext,
  });

  Map<String, dynamic> toJson() {
    return {
      'resourceType': resourceType,
      'id': id,
      'status': status,
      'category': [
        {
          'coding': [
            {
              'system': 'http://terminology.hl7.org/CodeSystem/observation-category',
              'code': categoryCode,
              'display': 'Vital Signs'
            }
          ]
        }
      ],
      'code': {
        'coding': [
          {'system': 'http://loinc.org', 'code': code, 'display': display}
        ],
        'text': display
      },
      'effectiveDateTime': effectiveDateTime,
      'component': [
        if (systolic != null)
          {
            'code': {
              'coding': [
                {'system': 'http://loinc.org', 'code': '8480-6', 'display': 'Systolic blood pressure'}
              ]
            },
            'valueQuantity': {'value': systolic, 'unit': 'mmHg', 'system': 'http://unitsofmeasure.org', 'code': 'mm[Hg]'}
          },
        if (diastolic != null)
          {
            'code': {
              'coding': [
                {'system': 'http://loinc.org', 'code': '8462-4', 'display': 'Diastolic blood pressure'}
              ]
            },
            'valueQuantity': {'value': diastolic, 'unit': 'mmHg', 'system': 'http://unitsofmeasure.org', 'code': 'mm[Hg]'}
          },
      ],
      if (measurementContext != null)
        'extension': [
          {
            'url': 'https://aortalink.health/fhir/StructureDefinition/measurement-context',
            'valueString': measurementContext
          }
        ]
    };
  }

  factory FhirObservationModel.fromJson(Map<String, dynamic> json) {
    return FhirObservationModel(
      resourceType: json['resourceType'] ?? 'Observation',
      id: json['id'] ?? '',
      status: json['status'] ?? 'final',
      code: json['code']?['coding']?[0]?['code'] ?? '85354-9',
      display: json['code']?['text'] ?? 'Blood Pressure',
      effectiveDateTime: json['effectiveDateTime'] ?? DateTime.now().toIso8601String(),
    );
  }
}
