import pandas as pd
from BasicUtility import BasicUtility
from ClassifierUtility import ClassifierUtility
from collections import OrderedDict
from sklearn.linear_model import LogisticRegression
from sklearn import svm
from sklearn import tree
from sklearn.model_selection import GridSearchCV

class TuningUtility:
    def __init__(self, dataframe):
        self.dataframe = dataframe
        
    def setDataframe(self, new_dataframe):
        self.dataframe = new_dataframe
    
    def getModelStability(self, scores):
        test_recall_std = scores.apply('std', axis=1)['test_recall']
        
        return test_recall_std
    
    def getModelGeneralization(self, scores):
        func = lambda col: abs(col['test_recall'] - col['train_recall'])
        absolute_differences = scores.apply(func=func, axis=0)
        absolute_differences_mean = absolute_differences.apply('mean')
        
        return absolute_differences_mean
    
    def getModelRocAuc(self, scores):
        roc_auc_mean = scores.apply('mean', axis=1)['test_roc_auc']
        
        return roc_auc_mean
    
    def tuneLogisticRegressionParameters(self):
        parameters = OrderedDict((
            ('C', [0.25, 0.5, 1.0, 2.0, 4.0]),
            ('penalty', ['l2', 'l1'])
        ))
        results = []
        columns = ['Accuracy', 'Precision', 'Recall', 'F1 Score', 'ROC AUC', 'Stability', 'Generalization']
        indexes = pd.MultiIndex.from_product(iterables=[parameters['penalty'], parameters['C']], names=['penalty', 'C'])
        
        for penalty in parameters['penalty']:
            for C in parameters['C']:
                classifier = LogisticRegression(C=C, penalty=penalty)
                utility = ClassifierUtility(classifier)

                cross_validation_scores = utility.doCrossValidation(self.dataframe)
                model_roc_auc = self.getModelRocAuc(cross_validation_scores)
                model_stability = self.getModelStability(cross_validation_scores)
                model_generalization = self.getModelGeneralization(cross_validation_scores)

                abtesting_result = utility.doABTesting(self.dataframe, test_all=False).values.tolist()[0]
                abtesting_result.append(model_roc_auc)
                abtesting_result.append(model_stability)
                abtesting_result.append(model_generalization)

                results.append(abtesting_result)
        
        df_result = pd.DataFrame(data=results, index=indexes, columns=columns)
        
        return df_result
    
    def tuneSVMParameters(self):
        parameters = OrderedDict((
            ('C', [0.25, 0.5, 1.0, 2.0, 4.0]),
            ('kernel', ['rbf', 'linear', 'poly'])
        ))
        results = []
        columns = ['Accuracy', 'Precision', 'Recall', 'F1 Score', 'ROC AUC', 'Stability', 'Generalization']
        indexes = pd.MultiIndex.from_product(iterables=[parameters['kernel'], parameters['C']], names=['kernel', 'C'])
        
        for kernel in parameters['kernel']:
            for C in parameters['C']:
                classifier = svm.SVC(C=C, kernel=kernel)
                utility = ClassifierUtility(classifier)

                cross_validation_scores = utility.doCrossValidation(self.dataframe)
                model_roc_auc = self.getModelRocAuc(cross_validation_scores)
                model_stability = self.getModelStability(cross_validation_scores)
                model_generalization = self.getModelGeneralization(cross_validation_scores)

                abtesting_result = utility.doABTesting(self.dataframe, test_all=False).values.tolist()[0]
                abtesting_result.append(model_roc_auc)
                abtesting_result.append(model_stability)
                abtesting_result.append(model_generalization)

                results.append(abtesting_result)
                
        return pd.DataFrame(data=results, index=indexes, columns=columns)
    
    def tuneDecisionTreeParameters(self):
        parameters = OrderedDict((
            ('max_depth', [3, 4, 5, 6, 7]),
            ('min_samples_leaf', [1, 5, 10])
        ))
        results = []
        columns = ['Accuracy', 'Precision', 'Recall', 'F1 Score', 'ROC AUC', 'Stability', 'Generalization']
        indexes = pd.MultiIndex.from_product(iterables=[parameters['max_depth'], parameters['min_samples_leaf']], names=['max_depth', 'min_samples_leaf'])
        
        for max_depth in parameters['max_depth']:
            for min_samples_leaf in parameters['min_samples_leaf']:
                classifier = tree.DecisionTreeClassifier(max_depth=max_depth, min_samples_leaf=min_samples_leaf)
                utility = ClassifierUtility(classifier)

                cross_validation_scores = utility.doCrossValidation(self.dataframe)
                model_roc_auc = self.getModelRocAuc(cross_validation_scores)
                model_stability = self.getModelStability(cross_validation_scores)
                model_generalization = self.getModelGeneralization(cross_validation_scores)

                abtesting_result = utility.doABTesting(self.dataframe, test_all=False).values.tolist()[0]
                abtesting_result.append(model_roc_auc)
                abtesting_result.append(model_stability)
                abtesting_result.append(model_generalization)

                results.append(abtesting_result)
                
        return pd.DataFrame(data=results, index=indexes, columns=columns)
    
    def tuneParameters(self, algorithm='LR'):
        
        classifiers = {
            'LR': LogisticRegression(),
            'DT': tree.DecisionTreeClassifier(),
            'SVM': svm.SVC()
        }
        
        parameters = {
            'LR': {
                'C': [0.25, 0.5, 1.0, 2.0, 4.0],
                'penalty': ['l2', 'l1']
            },
            'DT': {
                'max_depth': [3, 4, 5, 6, 7],
                'min_samples_leaf': [1, 5, 10]
            },
            'SVM': {
                'C': [0.25, 0.5, 1.0, 2.0, 4.0],
                'kernel': ['rbf', 'linear', 'poly']
            }
        }
        metrics = ['recall', 'precision']
        
        clf = GridSearchCV(
            estimator=classifiers[algorithm], 
            param_grid=parameters[algorithm], 
            scoring=metrics,
            cv=5,
            refit=metrics[0]
        )
        
        label_and_feature = BasicUtility.splitLabelFeature(self.dataframe)
        best_model = clf.fit(label_and_feature['feature'].values.tolist(), label_and_feature['label'])
        
        return best_model
                
        
    
    