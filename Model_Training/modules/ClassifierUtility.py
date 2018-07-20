import os
import sys
import traceback
import pandas as pd
from numpy import random
from sklearn import svm
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.model_selection import cross_validate
from BasicUtility import BasicUtility

class ClassifierUtility:
    def __init__(self, classifier):
        self.classifier = classifier
        
    def doCrossValidation(self, dataframe, k_folds=5):
        try:
            df_copy = dataframe.copy()
            dict_splitted = BasicUtility.splitLabelFeature(df_copy)
            label = dict_splitted['label'].values.tolist()
            feature = dict_splitted['feature'].values.tolist()
            
            metrics = ['accuracy', 'precision', 'recall', 'f1', 'roc_auc']
            dict_scores = {}
            indexes = []
            scores = []
            
            dict_scores = cross_validate(self.classifier, feature, label, cv=k_folds, scoring=metrics, return_train_score=True)
            for key in sorted(dict_scores.keys()):
                indexes.append(key)
                scores.append(dict_scores[key])
            
            return pd.DataFrame(data=scores, index=indexes)*100 
            
        except:
            print("[doCrossValidation]")
            traceback.print_exc()
            
    def doABTesting(self, dataframe, columns_for_testing=[], test_all=True):
        try:
            df_scores = self.doCrossValidation(dataframe)
            wanted_metrics = ["test_accuracy", "test_precision", "test_recall", "test_f1"]
            indexes = []
            mean_scores = []
            
            indexes.append("all")
            mean_scores.append(df_scores.aggregate('mean', axis=1).loc[wanted_metrics].values.tolist())
            
            if not columns_for_testing and test_all:
                columns_for_testing = BasicUtility.checkDataframe(dataframe).columns.values.tolist()
                filter_expression = (lambda x: (x != 'label') and (not x.endswith('_dummy')))
                columns_for_testing = filter(filter_expression, columns_for_testing)
          
            for column in columns_for_testing:
                df_copy = dataframe.copy()
                del df_copy[column]
                if (column+"_dummy") in df_copy.columns:
                    del df_copy[column+"_dummy"]
                
                df_scores = self.doCrossValidation(df_copy)
                indexes.append("w/o "+column)
                mean_scores.append(df_scores.aggregate('mean', axis=1).loc[wanted_metrics].values.tolist())
                
            return pd.DataFrame(data=mean_scores, index=indexes, columns=wanted_metrics)
        
        except:
            print("[doABTesting]")
            traceback.print_exc()
            
    def runExperiment(self, dataframe):
        try:
            columns_for_testing = [
                "length_of_fqdn",
                "replica_in_fqdn",
                "in_top_one_million",
                "num_of_currencies_seen",
                "num_of_duplicate_prices_seen",
                "percent_savings",
                "contain_emails",
                "large_iframes"
            ]
            
            df_keep_whois = dataframe.copy()
            df_discard_whois = dataframe.copy()
            for column_name in ['under_a_year', 'under_a_year_dummy', 'china_registered', 'china_registered_dummy']:
                if column_name in df_discard_whois.columns:
                    df_discard_whois = df_discard_whois.drop(columns=[column_name])
            '''df_discard_whois = df_keep_whois.drop(columns=[
                "under_a_year", 
                "under_a_year_dummy", 
                "china_registered", 
                "china_registered_dummy"
            ])'''
            
            df_keep_whois_result = self.doABTesting(df_keep_whois, columns_for_testing)
            df_discard_whois_result = self.doABTesting(df_discard_whois, columns_for_testing)
            
            names = ["Metric(5-fold mean(%))", "WHOIS"]
            iterables = [["Accuracy", "Precision", "Recall", "F1 Score"], ["keep", "discard"]]
            col_index = pd.MultiIndex.from_product(iterables=iterables, names=names)
            row_index = df_keep_whois_result.index
            
            wanted_metrics = ["test_accuracy", "test_precision", "test_recall", "test_f1"] #, "test_roc_auc"
            for i in range(0,len(wanted_metrics)):
                df_keep_whois_result.insert(
                    loc=i*2+1, 
                    column=wanted_metrics[i], 
                    value=df_discard_whois_result[wanted_metrics[i]], 
                    allow_duplicates=True
                )
            df_keep_whois_result.columns = col_index
            
            return df_keep_whois_result
        
        except:
            print("[runExperiment]")
            traceback.print_exc()
            
    def getModelCoefficients(self, dataframe):
        try:
            columns = []
            data = []
            
            #for i in range(0, len(dataframes)):
            dataset = BasicUtility.splitLabelFeature(dataframe)
            feature = dataset['feature'].values.tolist()
            label = dataset['label'].values.tolist()

            self.classifier.fit(feature, label)
            coefficients = self.classifier.coef_.tolist()[0]
                
            #indexes.append("dataset_"+str(dataset['feature'].shape[0]))
            data.append(coefficients)
            columns = dataset['feature'].columns
            
            return pd.DataFrame(data=data, columns=columns, index=['coefficients']).T
        
        except:
            print("[getModelCoefficients]")
            traceback.print_exc()
            
class myClassifierUtility:
    def __init__(self, classifier, dataframe):
        self.classifier = classifier
        df_copy = dataframe.copy()
        if 'url' in df_copy.columns:
            del df_copy['url']
        
        if 'hostname' in df_copy.columns:
            del df_copy['hostname']
        self.dataframe_original = df_copy
        
    def splitLabelFeature(self, dataframe):
        try:
            
            if 'url' in dataframe.columns:
                del dataframe['url']
        
            if 'hostname' in dataframe.columns:
                del dataframe['hostname']
                
            label = dataframe['label'].values.tolist()
            feature = dataframe.loc[:, dataframe.columns != 'label'].values.tolist()
            
            return {'label': label, 'feature': feature}
        
        except:
            print("[splitLabelFeature]")
            traceback.print_exc()
            
    def doCrossValidation(self, dataframe, k_folds):
        try:
            dataset = self.splitLabelFeature(dataframe)
            feature = dataset['feature']
            label = dataset['label']
            
            metrics = ['accuracy', 'precision', 'recall']
            scores = cross_validate(self.classifier, feature, label, cv=k_folds, scoring=metrics, return_train_score=True)
            
            return scores
            
        except:
            print("[doCrossValidation]")
            traceback.print_exc()
            
    def report(self, title, scores, verbose):
        try:
            print("-----["+title+"]-----")
            if verbose:
                print("Test Accuracy: "+get_nice_string(scores['test_accuracy']))
                print("mean: "+str(scores['test_accuracy'].mean())+" std: "+str(scores['test_accuracy'].std()))
                print("Test Precision: "+get_nice_string(scores['test_precision']))
                print("mean: "+str(scores['test_precision'].mean())+" std: "+str(scores['test_precision'].std()))
                print("Test Recall: "+get_nice_string(scores['test_recall']))
                print("mean: "+str(scores['test_recall'].mean())+" std: "+str(scores['test_recall'].std()))
            else:
                print("Accuracy mean: "+str(scores['test_accuracy'].mean())+" std: "+str(scores['test_accuracy'].std()))
                print("Precision mean: "+str(scores['test_precision'].mean())+" std: "+str(scores['test_precision'].std()))
                print("Recall mean: "+str(scores['test_recall'].mean())+" std: "+str(scores['test_recall'].std()))
                
        except:
            print("[report]")
            traceback.print_exc()
            
    def testModelStability(self, dataframe, title):
        scores = self.doCrossValidation(dataframe, k_folds=5)
        self.report(title, scores, verbose=False)
        
    def getCoefficients(self):
        try:
            dataset = self.splitLabelFeature(self.dataframe_original)
            feature = dataset['feature']
            label = dataset['label']

            self.classifier.fit(feature, label)
            coefficients = self.classifier.coef_.tolist()
            
            print("-----[Coefficients]-----")
            for i in range(1, len(self.dataframe_original.columns)):
                print(self.dataframe_original.columns[i]+": "+str(coefficients[0][i-1]))
                
        except:
            print("[getCoefficients]")
            traceback.print_exc()
    
    def evaluate(self, predicted, expected):
        try:
            TP, FP, TN, FN = 0, 0, 0, 0
            accuracy, precision, recall = -1, -1, -1

            for i in range(len(expected)):
                if expected[i] == 1:
                    if expected[i] == predicted[i]:
                        TP+=1
                    else:
                        FN+=1
                else:
                    if expected[i] == predicted[i]:
                        TN+=1
                    else:
                        FP+=1

            accuracy = 100*(TP+TN)/len(expected)
            precision = 100*TP/(TP+FP)
            recall = 100*TP/(TP+FN)

            print("Accuracy: {0:f}%\nPrecision: {1:f}%\nRecall: {2:f}%\n".format(accuracy, precision, recall))
            
        except:
            print("[evaluate]")
            traceback.print_exc()
    
    def predict(self, training_df, testing_df):
        try:
            training_set = self.splitLabelFeature(training_df)
            training_feature = training_set['feature']
            training_label = training_set['label']
            testing_set = self.splitLabelFeature(testing_df)
            testing_feature = testing_set['feature']
            testing_label = testing_set['label']
            
            #learn a model
            self.classifier.fit(training_feature, training_label)
            #predict values
            predicted = self.classifier.predict(testing_feature)
            #make evaluation
            self.evaluate(predicted, testing_label)
            
        except:
            print("[predict]")
            traceback.print_exc()
            
    def ABtesting(self, dataframe, column_names=[]):
        try:
            scores_dict = {}
            df_copy = dataframe.copy()
            del df_copy['label']
            
            if not column_names:
                #column_names = df_copy.columns.values.tolist()
                pass
            
            '''for column in df_copy.columns:
                feature_without_a_column = dataframe.copy()
                del feature_without_a_column[column]
                
                if (column+"_dummy") in df_copy.columns:
                    del feature_without_a_column[(column+'_dummy')]
                    self.testModelStability(feature_without_a_column, ('w/o '+column))
                elif "dummy" in column:
                    pass
                else:
                    self.testModelStability(feature_without_a_column, ('w/o '+column))'''
            scores = self.doCrossValidation(dataframe, k_folds=5)
            scores_dict["all"] = scores
            
            for column_name in column_names:
                feature_without_a_column = dataframe.copy()
                
                del feature_without_a_column[column_name]
                if (column_name+"_dummy") in df_copy.columns:
                    del feature_without_a_column[(column_name+'_dummy')]
                
                #self.testModelStability(feature_without_a_column, ('w/o '+column_name))
                scores = self.doCrossValidation(feature_without_a_column, k_folds=5)
                scores_dict[column_name] = scores
                
            return scores_dict
                    
        except:
            print("[ABtesting]")
            traceback.print_exc()
            
    def deleteColumns(self, column_names):
        try:
            df_copy = self.dataframe_original.copy()
            
            for column_name in column_names:
                del df_copy[column_name]
            
                if((column_name+"_dummy") in df_copy.columns):
                    del df_copy[(column_name+"_dummy")]
                
            return df_copy
                
        except:
            print("[deleteColumns]")
            traceback.print_exc()
            
    def experiment_1(self):
        df_without_whois = self.deleteColumns(['under_a_year', 'china_registered'])
        columns_for_ABtesting = df_without_whois.columns.values.tolist()[1:]
        
        scores_dict = self.ABtesting(self.dataframe_original, columns_for_ABtesting)
        scores_dict_without_whois = self.ABtesting(df_without_whois, columns_for_ABtesting)
        
        base = 'w/o '
        iterables = [['Accuracy', 'Precision', 'Recall'], ['keep', 'discard']]
        col_index = pd.MultiIndex.from_product(iterables, names=['Metric(mean)', 'WHOIS(under_a_year, china_registered)'])
        
        metric_matrix = []
        row_index = []
        for key in scores_dict:
            metric_values = []
            metric_values.append(scores_dict[key]["test_accuracy"].mean())
            metric_values.append(scores_dict_without_whois[key]["test_accuracy"].mean())
            metric_values.append(scores_dict[key]["test_precision"].mean())
            metric_values.append(scores_dict_without_whois[key]["test_precision"].mean())
            metric_values.append(scores_dict[key]["test_recall"].mean())
            metric_values.append(scores_dict_without_whois[key]["test_recall"].mean())
            if key == "all":
                row_index.insert(0, key)
                metric_matrix.insert(0, metric_values)
            else:
                row_index.append(base+key)
                metric_matrix.append(metric_values)
                
        df_result = pd.DataFrame(data=metric_matrix, index=row_index, columns=col_index)
        return df_result
        
def get_nice_string(list_obj):
    return "["+ ", ".join(str(x) for x in list_obj) + "]"