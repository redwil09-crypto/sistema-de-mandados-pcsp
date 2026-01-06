import { supabase } from './supabaseClient';
import type { Warrant } from './types';

// Helper to convert DD/MM/YYYY to YYYY-MM-DD
const toISODate = (dateStr: string | undefined): string | null => {
    if (!dateStr) return null;
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month}-${day}`;
    }
    return null;
};

// Helper to convert database format to app format
const dbToWarrant = (dbWarrant: any): Warrant => {
    return {
        id: dbWarrant.id,
        name: dbWarrant.name,
        type: dbWarrant.type,
        number: dbWarrant.number,
        status: dbWarrant.status,
        crime: dbWarrant.crime,
        regime: dbWarrant.regime,
        rg: dbWarrant.rg,
        cpf: dbWarrant.cpf,
        location: dbWarrant.location,
        description: dbWarrant.description,
        observation: dbWarrant.observation,
        img: dbWarrant.img,
        priority: dbWarrant.priority,
        age: dbWarrant.age,
        issueDate: dbWarrant.issue_date,
        entryDate: dbWarrant.entry_date,
        expirationDate: dbWarrant.expiration_date,
        dischargeDate: dbWarrant.discharge_date,
        ifoodNumber: dbWarrant.ifood_number,
        ifoodResult: dbWarrant.ifood_result,
        digOffice: dbWarrant.dig_office,
        reports: dbWarrant.reports || [],
        attachments: dbWarrant.attachments || [],
        tags: dbWarrant.tags || [],
        fulfillmentResult: dbWarrant.fulfillment_result,
        fulfillmentReport: dbWarrant.fulfillment_report,
        date: dbWarrant.entry_date || dbWarrant.created_at?.split('T')[0],
        createdAt: dbWarrant.created_at,
        updatedAt: dbWarrant.updated_at,
    };
};

// Helper to convert app format to database format
const warrantToDb = (warrant: Partial<Warrant>) => {
    const dbObj: any = {};

    if (warrant.name !== undefined) dbObj.name = warrant.name;
    if (warrant.type !== undefined) dbObj.type = warrant.type;
    if (warrant.number !== undefined) dbObj.number = warrant.number;
    if (warrant.status !== undefined) dbObj.status = warrant.status;
    if (warrant.crime !== undefined) dbObj.crime = warrant.crime;
    if (warrant.regime !== undefined) dbObj.regime = warrant.regime;
    if (warrant.rg !== undefined) dbObj.rg = warrant.rg;
    if (warrant.cpf !== undefined) dbObj.cpf = warrant.cpf;
    if (warrant.location !== undefined) dbObj.location = warrant.location;
    if (warrant.description !== undefined) dbObj.description = warrant.description;
    if (warrant.observation !== undefined) dbObj.observation = warrant.observation;
    if (warrant.img !== undefined) dbObj.img = warrant.img;
    if (warrant.priority !== undefined) dbObj.priority = warrant.priority;
    if (warrant.age !== undefined) dbObj.age = warrant.age;

    // Date normalization
    if (warrant.issueDate !== undefined) dbObj.issue_date = toISODate(warrant.issueDate);
    if (warrant.entryDate !== undefined) dbObj.entry_date = toISODate(warrant.entryDate);
    if (warrant.expirationDate !== undefined) dbObj.expiration_date = toISODate(warrant.expirationDate);
    if (warrant.dischargeDate !== undefined) dbObj.discharge_date = toISODate(warrant.dischargeDate);

    if (warrant.ifoodNumber !== undefined) dbObj.ifood_number = warrant.ifoodNumber;
    if (warrant.ifoodResult !== undefined) dbObj.ifood_result = warrant.ifoodResult;
    if (warrant.digOffice !== undefined) dbObj.dig_office = warrant.digOffice;
    if (warrant.reports !== undefined) dbObj.reports = warrant.reports;
    if (warrant.attachments !== undefined) dbObj.attachments = warrant.attachments;
    if (warrant.tags !== undefined) dbObj.tags = warrant.tags;
    if (warrant.fulfillmentResult !== undefined) dbObj.fulfillment_result = warrant.fulfillmentResult;
    if (warrant.fulfillmentReport !== undefined) dbObj.fulfillment_report = warrant.fulfillmentReport;

    return dbObj;
};

// Create a new warrant
export const createWarrant = async (warrant: Partial<Warrant>): Promise<Warrant | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error('User not authenticated');
        }

        const dbWarrant = warrantToDb(warrant);

        const { data, error } = await supabase
            .from('warrants')
            .insert([{ ...dbWarrant, user_id: user.id }])
            .select()
            .single();

        if (error) throw error;

        return dbToWarrant(data);
    } catch (error: any) {
        console.error('Error creating warrant details:', error.message || error, error);
        return null;
    }
};

// Get all warrants
export const getWarrants = async (): Promise<Warrant[]> => {
    try {
        const { data, error } = await supabase
            .from('warrants')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(dbToWarrant);
    } catch (error) {
        console.error('Error fetching warrants:', error);
        return [];
    }
};

// Get a single warrant by ID
export const getWarrantById = async (id: string): Promise<Warrant | null> => {
    try {
        const { data, error } = await supabase
            .from('warrants')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        return dbToWarrant(data);
    } catch (error) {
        console.error('Error fetching warrant:', error);
        return null;
    }
};

// Update a warrant
export const updateWarrant = async (id: string, updates: Partial<Warrant>): Promise<Warrant | null> => {
    try {
        const dbUpdates = warrantToDb(updates);

        const { data, error } = await supabase
            .from('warrants')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return dbToWarrant(data);
    } catch (error: any) {
        console.error('Error updating warrant details:', error.message || error, error);
        return null;
    }
};

// Delete a warrant
export const deleteWarrant = async (id: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('warrants')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return true;
    } catch (error) {
        console.error('Error deleting warrant:', error);
        return false;
    }
};
